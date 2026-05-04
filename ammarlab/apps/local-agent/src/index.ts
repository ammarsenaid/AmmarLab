import "dotenv/config";
import express from "express";
import cors from "cors";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentHealth, AgentLogEntry, Lab, LabActionResult, LabStatus, ProviderStatus, VmStatus } from "@ammarlab/shared";

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT ?? 4788);
const host = process.env.HOST ?? "127.0.0.1";
const localToken = process.env.LOCAL_TOKEN ?? "replace-with-local-token";
const enableLocalExecution = process.env.ENABLE_LOCAL_EXECUTION === "true";

if (enableLocalExecution) {
  console.warn("ENABLE_LOCAL_EXECUTION=true requested, but execution remains mocked.");
}

const providers: ProviderStatus[] = [
  { provider: "hyperv", detected: true, enabled: false, version: null, note: "Mocked detection. Future provider adapter pending." },
  { provider: "vmware", detected: true, enabled: false, version: null, note: "Mocked detection. Future provider adapter pending." }
];

const labsById = new Map<string, Lab>();
const statusesById = new Map<string, LabStatus>();
const logs: AgentLogEntry[] = [];

function addLog(entry: Omit<AgentLogEntry, "id" | "timestampIso">) {
  logs.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestampIso: new Date().toISOString(), ...entry });
}

function getLabStatus(lab: Lab): LabStatus {
  const status = statusesById.get(lab.id);
  if (status) return status;
  const vmStatuses: VmStatus[] = lab.vms.map((vm) => ({ vmId: vm.id, state: "stopped" }));
  const created: LabStatus = { labId: lab.id, state: "idle", vmStatuses, updatedAtIso: new Date().toISOString() };
  statusesById.set(lab.id, created);
  return created;
}

function setLabStatus(lab: Lab, state: LabStatus["state"], vmState: VmStatus["state"]) {
  const updated: LabStatus = {
    labId: lab.id,
    state,
    vmStatuses: lab.vms.map((vm) => ({ vmId: vm.id, state: vmState })),
    updatedAtIso: new Date().toISOString()
  };
  statusesById.set(lab.id, updated);
}

function requireLabId(body: unknown): { lab: Lab } | { message: string } {
  const labId = (body as { labId?: string })?.labId;
  if (!labId) return { message: "Please provide labId in the request body." };
  const lab = labsById.get(labId);
  if (!lab) return { message: `Lab '${labId}' was not found. Pick a valid lab from GET /labs.` };
  return { lab };
}

async function loadLabsFromManifests() {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultLabsDir = path.resolve(sourceDir, "../../../labs");
  const configuredLabsDir = process.env.LABS_DIR?.trim();
  const labsDir = configuredLabsDir ? path.resolve(configuredLabsDir) : defaultLabsDir;

  try {
    await access(labsDir);
  } catch {
    const envHint = configuredLabsDir
      ? `LABS_DIR was set to '${configuredLabsDir}'.`
      : "LABS_DIR is not set.";
    throw new Error(
      `Labs folder not found at '${labsDir}'. ${envHint} Set LABS_DIR to your monorepo labs folder (for example: <repo>/labs).`
    );
  }

  const entries = await readdir(labsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(labsDir, entry.name, "lab.json");
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as Lab;
    labsById.set(parsed.id, parsed);
    getLabStatus(parsed);
  }
}

app.use((req, res, next) => {
  const token = req.header("x-ammarlab-token");
  if (!token || token !== localToken) {
    return res.status(401).json({ message: "Missing or invalid local token." });
  }
  next();
});

app.get("/health", (_req, res) => {
  const payload: AgentHealth = { healthy: true, mode: "mock", listenAddress: `${host}:${port}`, timestampIso: new Date().toISOString() };
  res.json(payload);
});

app.get("/providers", (_req, res) => res.json(providers));
app.get("/system/resources", (_req, res) => res.json({ totalRamGb: 16, freeRamGb: 10, cpuCores: 8, diskFreeGb: 200, mocked: true }));
app.get("/labs", (_req, res) => res.json(Array.from(labsById.values())));
app.get("/labs/status", (_req, res) => res.json(Array.from(statusesById.values())));
app.get("/logs", (_req, res) => res.json(logs));

function actionResult(action: LabActionResult["action"], labId?: string): LabActionResult {
  return { success: true, action, labId, message: `${action.toUpperCase()} completed in mock mode.` };
}

app.post("/labs/start", (req, res) => {
  const resolved = requireLabId(req.body);
  if ("message" in resolved) return res.status(400).json({ success: false, message: resolved.message });
  setLabStatus(resolved.lab, "running", "running");
  addLog({ level: "info", action: "start", labId: resolved.lab.id, provider: "mock", message: `Started lab ${resolved.lab.title}.`, result: "success" });
  res.json(actionResult("start", resolved.lab.id));
});

app.post("/labs/stop", (req, res) => {
  const resolved = requireLabId(req.body);
  if ("message" in resolved) return res.status(400).json({ success: false, message: resolved.message });
  setLabStatus(resolved.lab, "idle", "stopped");
  addLog({ level: "info", action: "stop", labId: resolved.lab.id, provider: "mock", message: `Stopped lab ${resolved.lab.title}.`, result: "success" });
  res.json(actionResult("stop", resolved.lab.id));
});

app.post("/labs/reset", async (req, res) => {
  const resolved = requireLabId(req.body);
  if ("message" in resolved) return res.status(400).json({ success: false, message: resolved.message });
  setLabStatus(resolved.lab, "reset_in_progress", "resetting");
  await new Promise((resolve) => setTimeout(resolve, 300));
  setLabStatus(resolved.lab, "running", "running");
  addLog({ level: "info", action: "reset", labId: resolved.lab.id, provider: "mock", message: `Reset completed for ${resolved.lab.title}.`, result: "success" });
  res.json(actionResult("reset", resolved.lab.id));
});

app.post("/labs/import", (req, res) => {
  const resolved = requireLabId(req.body);
  if ("message" in resolved) return res.status(400).json({ success: false, message: resolved.message });
  addLog({ level: "info", action: "import", labId: resolved.lab.id, provider: "mock", message: `Import simulated for ${resolved.lab.title}.`, result: "success" });
  res.json(actionResult("import", resolved.lab.id));
});

loadLabsFromManifests().then(() => {
  app.listen(port, host, () => {
    console.log(`AmmarLab Local Agent (mock) listening on http://${host}:${port}`);
  });
}).catch((error) => {
  console.error("Failed to load lab manifests", error);
  process.exit(1);
});
