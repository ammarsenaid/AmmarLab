import { useEffect, useMemo, useState } from "react";
import type { AgentLogEntry, Lab, LabStatus, ProviderStatus } from "@ammarlab/shared";

const pages = ["Dashboard", "Lab Catalog", "Lab Runner", "Logs"];
const token = "replace-with-local-token";
const base = "http://127.0.0.1:4788";

export function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [online, setOnline] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [statuses, setStatuses] = useState<LabStatus[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busyAction, setBusyAction] = useState<string>("");

  async function call(path: string, opts?: RequestInit) {
    const res = await fetch(`${base}${path}`, { ...opts, headers: { "Content-Type": "application/json", "x-ammarlab-token": token, ...(opts?.headers ?? {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data;
  }

  const refreshAll = async () => {
    await Promise.all([loadLabs(), loadStatuses(), loadLogs(), detectProviders()]);
  };

  const detectAgent = async () => {
    try {
      await call("/health");
      setOnline(true);
      setError("");
      await refreshAll();
    } catch {
      setOnline(false);
      setError("Local Agent is offline or unreachable on 127.0.0.1:4788.");
    }
  };

  const detectProviders = async () => setProviders(await call("/providers"));
  const loadLabs = async () => setLabs(await call("/labs"));
  const loadStatuses = async () => setStatuses(await call("/labs/status"));
  const loadLogs = async () => setLogs(await call("/logs"));

  const selectedLab = useMemo(() => labs.find((l) => l.id === selectedLabId) ?? labs[0], [labs, selectedLabId]);
  const selectedStatus = useMemo(() => statuses.find((s) => s.labId === selectedLab?.id), [statuses, selectedLab]);

  useEffect(() => { detectAgent(); }, []);
  useEffect(() => { if (labs.length && !selectedLabId) setSelectedLabId(labs[0].id); }, [labs, selectedLabId]);

  const runAction = async (action: "start" | "stop" | "reset" | "import") => {
    if (!selectedLab) return;
    setBusyAction(action);
    setMessage("");
    setError("");
    try {
      const result = await call(`/labs/${action}`, { method: "POST", body: JSON.stringify({ labId: selectedLab.id }) });
      setMessage(result.message);
      await Promise.all([loadStatuses(), loadLogs()]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction("");
    }
  };

  return <div className="layout">
    <aside><h2>AmmarLab</h2>{pages.map((p) => <button key={p} onClick={() => setActivePage(p)}>{p}</button>)}</aside>
    <main>
      <h1>{activePage}</h1>
      {!online && <div className="offline">Offline: Local Agent not reachable on 127.0.0.1:4788</div>}
      {message && <div className="toast ok">{message}</div>}
      {error && <div className="toast err">{error}</div>}
      <div className="actions"><button onClick={detectAgent}>Detect Agent</button><button onClick={refreshAll} disabled={!online}>Refresh</button></div>

      <section className="cards">{providers.map((p) => <div className="card" key={p.provider}><h3>{p.provider}</h3><p>{p.detected ? "Detected" : "Missing"}</p><small>{p.note}</small></div>)}</section>

      <section className="cards">{labs.map((lab) => <div className="card" key={lab.id}><h3>{lab.title}</h3><p>{lab.description}</p><p>Difficulty: {lab.difficulty}</p><button onClick={() => setSelectedLabId(lab.id)}>Select</button></div>)}</section>

      {selectedLab && <section className="card">
        <h2>Lab Runner</h2>
        <p><strong>Selected lab:</strong> {selectedLab.title} ({selectedLab.id})</p>
        <p><strong>Lab status:</strong> {selectedStatus?.state ?? "idle"}</p>
        <h3>VM Statuses</h3>
        <ul>{selectedStatus?.vmStatuses.map((vm) => <li key={vm.vmId}>{vm.vmId}: {vm.state}</li>)}</ul>
        <div className="actions">
          <button disabled={!online || busyAction !== ""} onClick={() => runAction("start")}>{busyAction === "start" ? "Starting..." : "Start Lab"}</button>
          <button disabled={!online || busyAction !== ""} onClick={() => runAction("stop")}>{busyAction === "stop" ? "Stopping..." : "Stop Lab"}</button>
          <button disabled={!online || busyAction !== ""} onClick={() => runAction("reset")}>{busyAction === "reset" ? "Resetting..." : "Reset Lab"}</button>
          <button disabled={!online || busyAction !== ""} onClick={() => runAction("import")}>{busyAction === "import" ? "Importing..." : "Import Lab"}</button>
        </div>
      </section>}

      <section>
        <h2>Logs</h2>
        <ul>{logs.slice(0, 12).map((log) => <li key={log.id}>{log.timestampIso} [{log.level}] {log.action} {log.labId ?? "n/a"} - {log.message} ({log.result})</li>)}</ul>
      </section>
    </main>
  </div>;
}
