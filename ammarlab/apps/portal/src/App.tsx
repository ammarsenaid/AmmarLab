import { useEffect, useMemo, useState } from "react";
import type { AgentLogEntry, Lab, LabStatus, ProviderStatus } from "@ammarlab/shared";

type ActionType = "start" | "stop" | "reset" | "import";
type PageKey = "Dashboard" | "Lab Catalog" | "My Labs" | "Lab Detail" | "Lab Runner" | "Provider Detection" | "Local Agent Setup" | "Logs" | "Troubleshooting" | "Settings";

const navItems: PageKey[] = ["Dashboard", "Lab Catalog", "My Labs", "Lab Detail", "Lab Runner", "Provider Detection", "Local Agent Setup", "Logs", "Troubleshooting", "Settings"];
const DEFAULT_BASE = "http://127.0.0.1:4788";
const DEFAULT_TOKEN = "replace-with-local-token";
const minutesToDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("Dashboard");
  const [online, setOnline] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [statuses, setStatuses] = useState<LabStatus[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busyAction, setBusyAction] = useState<string>("");
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [logLevelFilter, setLogLevelFilter] = useState("all");
  const [logActionFilter, setLogActionFilter] = useState("all");
  const [settings, setSettings] = useState(() => ({ agentUrl: localStorage.getItem("ammarlab.agentUrl") ?? DEFAULT_BASE, token: localStorage.getItem("ammarlab.token") ?? DEFAULT_TOKEN, defaultProvider: localStorage.getItem("ammarlab.defaultProvider") ?? "hyperv", theme: localStorage.getItem("ammarlab.theme") ?? "premium-dark" }));

  async function call(path: string, opts?: RequestInit) {
    const res = await fetch(`${settings.agentUrl}${path}`, { ...opts, headers: { "Content-Type": "application/json", "x-ammarlab-token": settings.token, ...(opts?.headers ?? {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data;
  }

  const detectProviders = async () => setProviders(await call("/providers"));
  const loadLabs = async () => setLabs(await call("/labs"));
  const loadStatuses = async () => setStatuses(await call("/labs/status"));
  const loadLogs = async () => setLogs(await call("/logs"));

  const detectAgent = async () => {
    try { await call("/health"); setOnline(true); setError(""); await Promise.all([loadLabs(), loadStatuses(), loadLogs(), detectProviders()]); }
    catch { setOnline(false); setError(`Local Agent is offline or unreachable on ${settings.agentUrl}.`); }
  };

  const selectedLab = useMemo(() => labs.find((l) => l.id === selectedLabId) ?? null, [labs, selectedLabId]);
  const selectedStatus = useMemo(() => statuses.find((s) => s.labId === selectedLab?.id), [statuses, selectedLab]);
  useEffect(() => { void detectAgent(); }, [settings.agentUrl, settings.token]);
  useEffect(() => { if (labs.length && !selectedLabId) setSelectedLabId(labs[0].id); }, [labs, selectedLabId]);

  const runAction = async (action: ActionType, labId?: string, openRunner = false) => {
    const target = labId ?? selectedLab?.id;
    if (!target) return;
    setSelectedLabId(target);
    setBusyAction(`${action}:${target}`);
    setMessage(""); setError("");
    try {
      const result = await call(`/labs/${action}`, { method: "POST", body: JSON.stringify({ labId: target }) });
      setMessage(result.message);
      await Promise.all([loadStatuses(), loadLogs()]);
      if (openRunner) setActivePage("Lab Runner");
    } catch (err) { setError((err as Error).message); }
    finally { setBusyAction(""); }
  };

  const filteredLabs = useMemo(() => labs.filter((lab) => {
    const matchesSearch = `${lab.title} ${lab.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || lab.difficulty === difficultyFilter;
    const matchesProvider = providerFilter === "all" || lab.supportedProviders.includes(providerFilter as "hyperv" | "vmware");
    return matchesSearch && matchesDifficulty && matchesProvider;
  }).sort((a, b) => sortBy === "duration" ? a.estimatedDurationMinutes - b.estimatedDurationMinutes : sortBy === "difficulty" ? a.difficulty.localeCompare(b.difficulty) : a.title.localeCompare(b.title)), [labs, search, difficultyFilter, providerFilter, sortBy]);

  const selectedLabLogs = logs.filter((l) => l.labId === selectedLab?.id).slice(0, 8);
  const filteredLogs = logs.filter((log) => (logLevelFilter === "all" || log.level === logLevelFilter) && (logActionFilter === "all" || log.action === logActionFilter));
  const providerReady = selectedLab?.supportedProviders.some((p) => providers.find((x) => x.provider === p && x.detected));

  return <div className="app-shell"><aside className="sidebar glass-panel"><div className="brand-block"><div className="brand-logo">A</div><div><h2>AmmarLab</h2><p>Local-first IT Labs</p></div></div><nav className="nav-list">{navItems.map((item) => <button key={item} className={`nav-item ${activePage === item ? "active" : ""}`} onClick={() => setActivePage(item)}>{item}</button>)}</nav></aside>
    <main className="dashboard"><header className="topbar glass-panel"><h2>{activePage}</h2><div className="top-actions"><span className="badge">Local Mode</span><button className="ghost" onClick={() => void detectAgent()}>Detect Agent</button></div></header>{message && <div className="toast ok">{message}</div>}{error && <div className="toast err">{error}</div>}

      {activePage === "Lab Catalog" && <section className="glass-panel page"><div className="filters"><input placeholder="Search title or description..." value={search} onChange={(e) => setSearch(e.target.value)} /><select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}><option value="all">All difficulty</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}><option value="all">All providers</option><option value="hyperv">Hyper-V</option><option value="vmware">VMware</option></select><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="title">Sort: Title</option><option value="duration">Sort: Duration</option><option value="difficulty">Sort: Difficulty</option></select></div><div className="labs-grid">{filteredLabs.map((lab) => <article className="lab-card" key={lab.id}><h3>{lab.title}</h3><p>{lab.description}</p><div className="lab-meta"><span className="badge">{lab.difficulty}</span><span>{minutesToDuration(lab.estimatedDurationMinutes)}</span><span>{lab.vms.length} VM(s)</span><span>{lab.requiredRamGb}GB RAM</span><span>{lab.requiredCpuCores} vCPU</span><span>{lab.requiredDiskGb}GB Disk</span></div><div className="provider-badges">{lab.supportedProviders.map((p) => <span className="badge" key={p}>{p}</span>)}</div><div className="actions"><button onClick={() => void runAction("start", lab.id, true)}>Start Lab</button><button className="ghost" onClick={() => { setSelectedLabId(lab.id); setActivePage("Lab Detail"); }}>View Details</button></div></article>)}</div>{!filteredLabs.length && <div className="empty">No labs match your current search and filters.</div>}</section>}

      {activePage === "Lab Detail" && <section className="glass-panel page">{selectedLab ? <><h2>{selectedLab.title}</h2><p>{selectedLab.description}</p><div className="lab-meta"><span className="badge">{selectedLab.difficulty}</span><span>{minutesToDuration(selectedLab.estimatedDurationMinutes)}</span><span>{selectedLab.requiredRamGb}GB RAM / {selectedLab.requiredCpuCores} vCPU / {selectedLab.requiredDiskGb}GB Disk</span><span>Providers: {selectedLab.supportedProviders.join(", ")}</span></div><div className="split"><div><h3>VM List</h3>{selectedLab.vms.map((vm) => <div className="table-row" key={vm.id}><span>{vm.name}</span><span>{vm.os}</span><span>{vm.ramGb}GB</span><span>{vm.cpuCores} vCPU</span><span>{vm.diskGb}GB</span></div>)}</div><div><h3>Readiness checklist</h3><ul><li>Local Agent: <strong className={online ? "online" : "offline"}>{online ? "Online" : "Offline"}</strong></li><li>Provider detected: <strong>{providerReady ? "Yes" : "No"}</strong></li><li>Enough RAM: <strong>Placeholder OK</strong></li><li>Lab manifest loaded: <strong>{selectedLab ? "Yes" : "No"}</strong></li></ul></div></div><h3>Snapshots / checkpoints</h3><ul>{selectedLab.snapshots.map((s) => <li key={s}>{s}</li>)}</ul><h3>Student Instructions</h3><ol>{selectedLab.studentInstructions.map((i) => <li key={i}>{i}</li>)}</ol><div className="actions"><button onClick={() => void runAction("start")}>Start Lab</button><button className="ghost" onClick={() => void runAction("import")}>Import Lab</button><button className="ghost" onClick={() => setActivePage("Lab Runner")}>Open Lab Runner</button></div></> : <div className="empty"><p>No lab selected yet.</p><button onClick={() => setActivePage("Lab Catalog")}>Go to Lab Catalog</button></div>}</section>}

      {activePage === "Lab Runner" && <section className="glass-panel page">{selectedLab ? <><h2>{selectedLab.title}</h2><p>Lab state: <span className={`badge status-${selectedStatus?.state ?? "idle"}`}>{selectedStatus?.state ?? "idle"}</span></p><div className="actions"><button disabled={busyAction !== ""} onClick={() => void runAction("start")}>Start Lab</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("stop")}>Stop Lab</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("reset")}>Reset Lab</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("import")}>Import Lab</button><button className="ghost" onClick={() => void Promise.all([loadStatuses(), loadLogs()])}>Refresh Status</button></div><div className="vm-grid">{selectedLab.vms.map((vm) => { const vmState = selectedStatus?.vmStatuses.find((s) => s.vmId === vm.id)?.state ?? "idle"; return <article key={vm.id} className="lab-card"><h4>{vm.name}</h4><p>{vm.os}</p><p>{vm.ramGb}GB RAM • {vm.cpuCores} vCPU • {vm.diskGb}GB Disk</p><span className={`badge status-${vmState}`}>{vmState}</span></article>; })}</div><div className="hint"><strong>What happens when I reset?</strong><p>Reset returns each VM to the configured checkpoint/snapshot baseline so students can restart the exercise safely.</p></div><h3>Latest logs</h3><div>{selectedLabLogs.map((log) => <div className="table-row" key={log.id}><span>{new Date(log.timestampIso).toLocaleTimeString()}</span><span>{log.level}</span><span>{log.action}</span><span>{log.message}</span></div>)}</div></> : <div className="empty"><p>No lab selected for runner.</p><button onClick={() => setActivePage("Lab Catalog")}>Choose Lab</button></div>}</section>}

    </main></div>;
}
