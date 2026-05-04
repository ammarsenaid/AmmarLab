import "dotenv/config";
import express from "express";
import cors from "cors";
import type { AgentHealth, Lab, LabActionResult, LabStatus, ProviderStatus } from "@ammarlab/shared";

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT ?? 4788);
const host = process.env.HOST ?? "127.0.0.1";
const localToken = process.env.LOCAL_TOKEN ?? "replace-with-local-token";
const enableLocalExecution = process.env.ENABLE_LOCAL_EXECUTION === "true";

// Task 1 safety: keep all execution mocked.
// Future: add provider adapters for Hyper-V and VMware Workstation here.
if (enableLocalExecution) {
  console.warn("ENABLE_LOCAL_EXECUTION=true requested, but Task 1 keeps execution mocked.");
}

const labs: Lab[] = [
  {
    id: "linux-basics",
    title: "Linux Basics",
    description: "CLI navigation, files, permissions, and process management.",
    difficulty: "beginner",
    estimatedDurationMinutes: 90,
    requiredRamGb: 4,
    requiredCpuCores: 2,
    requiredDiskGb: 20,
    supportedProviders: ["hyperv", "vmware"],
    vms: [{ id: "linux-01", name: "Ubuntu Student VM", os: "Ubuntu 22.04", ramGb: 4, cpuCores: 2, diskGb: 20, snapshotName: "baseline" }],
    manifest: { version: "1.0.0", instructions: ["Boot VM", "Complete terminal exercises", "Save notes"] }
  }
];

let statuses: LabStatus[] = [
  { labId: "linux-basics", state: "stopped", activeVmIds: [], updatedAtIso: new Date().toISOString() }
];

const providers: ProviderStatus[] = [
  { provider: "hyperv", detected: true, enabled: false, version: null, note: "Mocked detection. Future provider adapter pending." },
  { provider: "vmware", detected: true, enabled: false, version: null, note: "Mocked detection. Future provider adapter pending." }
];

app.use((req, res, next) => {
  const token = req.header("x-ammarlab-token");
  if (!token || token !== localToken) {
    return res.status(401).json({ message: "Missing or invalid local token." });
  }
  next();
});

app.get("/health", (_req, res) => {
  const payload: AgentHealth = {
    healthy: true,
    mode: "mock",
    listenAddress: `${host}:${port}`,
    timestampIso: new Date().toISOString()
  };
  res.json(payload);
});

app.get("/providers", (_req, res) => res.json(providers));
app.get("/system/resources", (_req, res) => res.json({ totalRamGb: 16, freeRamGb: 10, cpuCores: 8, diskFreeGb: 200, mocked: true }));
app.get("/labs", (_req, res) => res.json(labs));
app.get("/labs/status", (_req, res) => res.json(statuses));

function actionResult(action: LabActionResult["action"], labId?: string): LabActionResult {
  return { success: true, action, labId, message: `${action.toUpperCase()} completed in mock mode.` };
}

app.post("/labs/start", (req, res) => {
  const { labId } = req.body as { labId: string };
  statuses = statuses.map((s) => (s.labId === labId ? { ...s, state: "running", activeVmIds: ["linux-01"], updatedAtIso: new Date().toISOString() } : s));
  res.json(actionResult("start", labId));
});
app.post("/labs/stop", (req, res) => {
  const { labId } = req.body as { labId: string };
  statuses = statuses.map((s) => (s.labId === labId ? { ...s, state: "stopped", activeVmIds: [], updatedAtIso: new Date().toISOString() } : s));
  res.json(actionResult("stop", labId));
});
app.post("/labs/reset", (req, res) => {
  const { labId } = req.body as { labId: string };
  statuses = statuses.map((s) => (s.labId === labId ? { ...s, state: "stopped", activeVmIds: [], updatedAtIso: new Date().toISOString() } : s));
  res.json(actionResult("reset", labId));
});
app.post("/labs/import", (_req, res) => res.json(actionResult("import")));

app.listen(port, host, () => {
  console.log(`AmmarLab Local Agent (mock) listening on http://${host}:${port}`);
});
