import "dotenv/config";
import express from "express";
import cors from "cors";
import os from "node:os";
import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import type { AgentHealth, AgentLogEntry, Lab, LabActionResult, LabStatus, ProviderStatus, SystemResources, VmStatus } from "@ammarlab/shared";
const execFileAsync = promisify(execFile);
const app = express(); app.use(cors()); app.use(express.json());
const port = Number(process.env.PORT ?? 4788); const host = process.env.HOST ?? "127.0.0.1"; const localToken = process.env.LOCAL_TOKEN ?? "replace-with-local-token"; const enableLocalExecution = process.env.ENABLE_LOCAL_EXECUTION === "true";
if (enableLocalExecution) console.warn("ENABLE_LOCAL_EXECUTION=true requested, but execution remains mocked.");
const labsById = new Map<string, Lab>(); const statusesById = new Map<string, LabStatus>(); const logs: AgentLogEntry[] = [];
const round = (v: number) => Math.round(v * 10) / 10;
function addLog(entry: Omit<AgentLogEntry, "id" | "timestampIso">) { logs.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestampIso: new Date().toISOString(), ...entry }); }
async function runPowerShell(command: string) { return execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { timeout: 6000 }); }
async function isPowerShellAvailable() { try { await execFileAsync("powershell.exe", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], { timeout: 4000 }); return true; } catch { return false; } }
async function detectElevated(powerShellAvailable: boolean): Promise<boolean | null> { if (process.platform !== "win32" || !powerShellAvailable) return null; try { const { stdout } = await runPowerShell("$p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"); return stdout.trim().toLowerCase() === "true"; } catch { return null; } }
async function getDiskInfo(): Promise<{ diskTotalGb: number | null; diskFreeGb: number | null }> { if (process.platform !== "win32") return { diskTotalGb: null, diskFreeGb: null }; try { const drive = process.cwd().slice(0, 2); const { stdout } = await runPowerShell(`$d=Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='${drive}'\"; if($d){\"$($d.Size)|$($d.FreeSpace)\"}`); const [size, free] = stdout.trim().split("|").map((x) => Number(x)); return Number.isFinite(size) ? { diskTotalGb: round(size / 1024 ** 3), diskFreeGb: round(free / 1024 ** 3) } : { diskTotalGb: null, diskFreeGb: null }; } catch { return { diskTotalGb: null, diskFreeGb: null }; } }
async function getSystemResources(): Promise<SystemResources> {
  const powerShellAvailable = await isPowerShellAvailable(); const isElevated = await detectElevated(powerShellAvailable); const disk = await getDiskInfo();
  let virtualizationLikelyPresent: boolean | null = null; let virtualizationHint = "Not checked";
  let hypervisorPresent: boolean | null = null; let virtualizationSupported: boolean | null = null;
  if (process.platform === "win32" && powerShellAvailable) {
    try {
      const hv = await runPowerShell("$c=Get-CimInstance Win32_ComputerSystem; if($null -ne $c.HypervisorPresent){$c.HypervisorPresent}else{'Unknown'}");
      const fw = await runPowerShell("$c=Get-CimInstance Win32_Processor | Select-Object -First 1; if($null -ne $c.VirtualizationFirmwareEnabled){$c.VirtualizationFirmwareEnabled}else{'Unknown'}");
      const hvs = hv.stdout.trim().toLowerCase(); const fws = fw.stdout.trim().toLowerCase();
      hypervisorPresent = hvs === "true" ? true : hvs === "false" ? false : null;
      virtualizationSupported = fws === "true" ? true : fws === "false" ? false : null;
      virtualizationLikelyPresent = hypervisorPresent === true || virtualizationSupported === true;
      virtualizationHint = virtualizationLikelyPresent ? "CPU virtualization support or Windows hypervisor is present." : "No virtualization support/hypervisor signal detected.";
    } catch { virtualizationHint = "Virtualization capability check failed"; }
  }
  return { platform: process.platform, osVersion: os.release(), hostname: os.hostname(), username: os.userInfo().username ?? null, cpuModel: os.cpus()[0]?.model ?? "Unknown", cpuLogicalCores: os.cpus().length, totalRamGb: round(os.totalmem() / 1024 ** 3), freeRamGb: round(os.freemem() / 1024 ** 3), ...disk, powerShellAvailable, nodeVersion: process.version, isElevated, virtualizationLikelyPresent, virtualizationHint, hypervisorPresent, virtualizationSupported, mocked: false };
}
async function detectProviders(): Promise<ProviderStatus[]> {
  const powerShellAvailable = await isPowerShellAvailable(); const isElevated = await detectElevated(powerShellAvailable);
  let hypervState: ProviderStatus = { provider: "hyperv", detected: false, enabled: false, state: "not_detected", version: null, note: "Hyper-V not detected", message: "Get-VM command not found", details: [] };
  if (process.platform !== "win32") {
    hypervState = { ...hypervState, state: "unavailable", note: "Windows-only provider", message: "Hyper-V not available on this OS", details: [{ key: "platform", value: process.platform }] };
  } else if (!powerShellAvailable) {
    hypervState = { ...hypervState, state: "unavailable", note: "PowerShell missing", message: "Hyper-V PowerShell module unavailable", details: [{ key: "powershell", value: "not found" }] };
  } else {
    try {
      const mod = (await runPowerShell("if(Get-Module -ListAvailable -Name Hyper-V){'true'}else{'false'}")).stdout.trim().toLowerCase() === "true";
      const getVm = (await runPowerShell("if(Get-Command Get-VM -ErrorAction SilentlyContinue){'true'}else{'false'}")).stdout.trim().toLowerCase() === "true";
      const feature = (await runPowerShell("$f=Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -ErrorAction SilentlyContinue; if($f){$f.State}else{'Unknown'}")).stdout.trim();
      const vmms = (await runPowerShell("$s=Get-Service vmms -ErrorAction SilentlyContinue; if($s){$s.Status}else{'Missing'}")).stdout.trim();
      const whp = (await runPowerShell("$f=Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -ErrorAction SilentlyContinue; if($f){$f.State}else{'Missing'}")).stdout.trim();
      const vmp = (await runPowerShell("$f=Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue; if($f){$f.State}else{'Missing'}")).stdout.trim();
      const wsl = (await runPowerShell("$f=Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue; if($f){$f.State}else{'Missing'}")).stdout.trim();
      const featureEnabled = feature.toLowerCase() === "enabled";
      const vmmsReady = ["running","stopped"].includes(vmms.toLowerCase());
      const fullInstalled = featureEnabled;
      const ready = fullInstalled && getVm && mod && vmmsReady && isElevated !== false;
      const moduleOnly = !fullInstalled && getVm;
      const state = ready ? "ready" : fullInstalled && isElevated === false ? "permission_required" : moduleOnly ? "module_only" : fullInstalled ? "detected" : feature.toLowerCase() === "disabled" ? "not_enabled" : "not_installed";
      const message = ready ? "Hyper-V is installed and ready for VM control." : fullInstalled && isElevated === false ? "Hyper-V appears installed, but running the Local Agent as Administrator may be required for VM control." : moduleOnly ? "Hyper-V PowerShell cmdlets exist, but full Hyper-V is not enabled." : "CPU virtualization or Windows hypervisor is present, but full Hyper-V is not installed/enabled.";
      hypervState = { provider: "hyperv", detected: ready || fullInstalled, enabled: ready, state, version: null, note: message, message, details: [{ key: "hyperv_feature", value: feature || "unknown" }, { key: "hyperv_module", value: String(mod) }, { key: "get_vm", value: String(getVm) }, { key: "vmms", value: vmms || "unknown" }, { key: "windows_hypervisor_platform", value: whp || "unknown" }, { key: "virtual_machine_platform", value: vmp || "unknown" }, { key: "wsl_feature", value: wsl || "unknown" }, { key: "is_elevated", value: String(isElevated) }] };
    } catch (error) { addLog({ level: "error", action: "agent", labId: null, provider: "mock", message: `Hyper-V detection warning: ${(error as Error).message}`, result: "error" }); }
  }
  const vmrunCandidates = [process.env.VMRUN_PATH?.trim(), "C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmrun.exe", "C:\\Program Files\\VMware\\VMware Workstation\\vmrun.exe"].filter(Boolean) as string[];
  let foundVmrun: string | null = null;
  for (const candidate of vmrunCandidates) { try { await access(candidate, constants.F_OK); foundVmrun = candidate; break; } catch { } }
  const vmware: ProviderStatus = { provider: "vmware", detected: Boolean(foundVmrun), enabled: Boolean(foundVmrun), state: foundVmrun ? "detected" : "not_detected", version: null, note: foundVmrun ? "vmrun detected" : "VMware Workstation vmrun.exe not found", message: foundVmrun ? `vmrun found at ${foundVmrun}` : "Set VMRUN_PATH or install VMware Workstation", details: [{ key: "vmrun_path", value: foundVmrun ?? "not found" }, { key: "checked_paths", value: vmrunCandidates.join("; ") }] };
  return [hypervState, vmware];
}
function getLabStatus(lab: Lab): LabStatus { const status = statusesById.get(lab.id); if (status) return status; const vmStatuses: VmStatus[] = lab.vms.map((vm) => ({ vmId: vm.id, state: "stopped" })); const created: LabStatus = { labId: lab.id, state: "idle", vmStatuses, updatedAtIso: new Date().toISOString() }; statusesById.set(lab.id, created); return created; }
function setLabStatus(lab: Lab, state: LabStatus["state"], vmState: VmStatus["state"]) { statusesById.set(lab.id, { labId: lab.id, state, vmStatuses: lab.vms.map((vm) => ({ vmId: vm.id, state: vmState })), updatedAtIso: new Date().toISOString() }); }
function requireLabId(body: unknown): { lab: Lab } | { message: string } { const labId = (body as { labId?: string })?.labId; if (!labId) return { message: "Please provide labId in the request body." }; const lab = labsById.get(labId); if (!lab) return { message: `Lab '${labId}' was not found. Pick a valid lab from GET /labs.` }; return { lab }; }
async function loadLabsFromManifests() { const sourceDir = path.dirname(fileURLToPath(import.meta.url)); const labsDir = process.env.LABS_DIR?.trim() ? path.resolve(process.env.LABS_DIR.trim()) : path.resolve(sourceDir, "../../../labs"); await access(labsDir); const entries = await readdir(labsDir, { withFileTypes: true }); for (const entry of entries) { if (!entry.isDirectory()) continue; const parsed = JSON.parse(await readFile(path.join(labsDir, entry.name, "lab.json"), "utf8")) as Lab; labsById.set(parsed.id, parsed); getLabStatus(parsed);} }
app.use((req,res,next)=>{ const token=req.header("x-ammarlab-token"); if(!token||token!==localToken) return res.status(401).json({message:"Missing or invalid local token."}); next();});
app.get("/health",(_req,res)=>{const payload:AgentHealth={healthy:true,mode:"mock",listenAddress:`${host}:${port}`,timestampIso:new Date().toISOString()};res.json(payload);});
app.get("/providers", async (_req,res)=>res.json(await detectProviders()));
app.get("/system/resources", async (_req,res)=>res.json(await getSystemResources()));
app.get("/labs", (_req,res)=>res.json(Array.from(labsById.values()))); app.get("/labs/status",(_req,res)=>res.json(Array.from(statusesById.values()))); app.get("/logs",(_req,res)=>res.json(logs));
function actionResult(action: LabActionResult["action"], labId?: string): LabActionResult { return { success: true, action, labId, message: `${action.toUpperCase()} completed in mock mode.` }; }
app.post("/labs/start",(req,res)=>{const r=requireLabId(req.body); if("message" in r) return res.status(400).json({success:false,message:r.message}); setLabStatus(r.lab,"running","running"); addLog({level:"info",action:"start",labId:r.lab.id,provider:"mock",message:`Started lab ${r.lab.title}.`,result:"success"}); res.json(actionResult("start",r.lab.id));});
app.post("/labs/stop",(req,res)=>{const r=requireLabId(req.body); if("message" in r) return res.status(400).json({success:false,message:r.message}); setLabStatus(r.lab,"idle","stopped"); addLog({level:"info",action:"stop",labId:r.lab.id,provider:"mock",message:`Stopped lab ${r.lab.title}.`,result:"success"}); res.json(actionResult("stop",r.lab.id));});
app.post("/labs/reset",async(req,res)=>{const r=requireLabId(req.body); if("message" in r) return res.status(400).json({success:false,message:r.message}); setLabStatus(r.lab,"reset_in_progress","resetting"); await new Promise((resolve)=>setTimeout(resolve,300)); setLabStatus(r.lab,"running","running"); addLog({level:"info",action:"reset",labId:r.lab.id,provider:"mock",message:`Reset completed for ${r.lab.title}.`,result:"success"}); res.json(actionResult("reset",r.lab.id));});
app.post("/labs/import",(req,res)=>{const r=requireLabId(req.body); if("message" in r) return res.status(400).json({success:false,message:r.message}); addLog({level:"info",action:"import",labId:r.lab.id,provider:"mock",message:`Import simulated for ${r.lab.title}.`,result:"success"}); res.json(actionResult("import",r.lab.id));});
loadLabsFromManifests().then(()=>{app.listen(port,host,()=>console.log(`AmmarLab Local Agent (mock) listening on http://${host}:${port}`));}).catch((error)=>{console.error("Failed to load lab manifests",error);process.exit(1);});
