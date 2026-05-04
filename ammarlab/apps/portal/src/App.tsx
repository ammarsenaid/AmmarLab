import { useEffect, useMemo, useState } from "react";
import type { AgentLogEntry, Lab, LabStatus, ProviderStatus } from "@ammarlab/shared";

type ActionType = "start" | "stop" | "reset" | "import";
type PageKey =
  | "Dashboard"
  | "Lab Catalog"
  | "My Labs"
  | "Lab Detail"
  | "Lab Runner"
  | "Provider Detection"
  | "Local Agent Setup"
  | "Logs"
  | "Troubleshooting"
  | "Settings";

const navItems: PageKey[] = [
  "Dashboard",
  "Lab Catalog",
  "My Labs",
  "Lab Detail",
  "Lab Runner",
  "Provider Detection",
  "Local Agent Setup",
  "Logs",
  "Troubleshooting",
  "Settings"
];

const DEFAULT_BASE = "http://127.0.0.1:4788";
const DEFAULT_TOKEN = "replace-with-local-token";

const prettyName: Record<string, string> = {
  "linux-basics": "Linux Basics",
  "windows-server-basics": "Windows Server Basics",
  "active-directory-beginner": "Active Directory Beginner"
};

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
  const [logLevelFilter, setLogLevelFilter] = useState("all");
  const [logActionFilter, setLogActionFilter] = useState("all");

  const [settings, setSettings] = useState(() => ({
    agentUrl: localStorage.getItem("ammarlab.agentUrl") ?? DEFAULT_BASE,
    token: localStorage.getItem("ammarlab.token") ?? DEFAULT_TOKEN,
    defaultProvider: localStorage.getItem("ammarlab.defaultProvider") ?? "hyperv",
    theme: localStorage.getItem("ammarlab.theme") ?? "premium-dark"
  }));

  async function call(path: string, opts?: RequestInit) {
    const res = await fetch(`${settings.agentUrl}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", "x-ammarlab-token": settings.token, ...(opts?.headers ?? {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data;
  }

  const detectProviders = async () => setProviders(await call("/providers"));
  const loadLabs = async () => setLabs(await call("/labs"));
  const loadStatuses = async () => setStatuses(await call("/labs/status"));
  const loadLogs = async () => setLogs(await call("/logs"));
  const refreshAll = async () => Promise.all([loadLabs(), loadStatuses(), loadLogs(), detectProviders()]);

  const detectAgent = async () => {
    try {
      await call("/health");
      setOnline(true);
      setError("");
      await refreshAll();
    } catch {
      setOnline(false);
      setError(`Local Agent is offline or unreachable on ${settings.agentUrl}.`);
    }
  };

  const selectedLab = useMemo(() => labs.find((l) => l.id === selectedLabId) ?? null, [labs, selectedLabId]);
  const selectedStatus = useMemo(() => statuses.find((s) => s.labId === selectedLab?.id), [statuses, selectedLab]);

  useEffect(() => {
    void detectAgent();
  }, [settings.agentUrl, settings.token]);

  useEffect(() => {
    if (labs.length && !selectedLabId) setSelectedLabId(labs[0].id);
  }, [labs, selectedLabId]);

  const runAction = async (action: ActionType, labId?: string) => {
    const target = labId ?? selectedLab?.id;
    if (!target) return;
    setBusyAction(`${action}:${target}`);
    setMessage("");
    setError("");
    try {
      const result = await call(`/labs/${action}`, { method: "POST", body: JSON.stringify({ labId: target }) });
      setMessage(result.message);
      await Promise.all([loadStatuses(), loadLogs()]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction("");
    }
  };

  const filteredLabs = labs.filter((lab) => {
    const matchesSearch = `${lab.title} ${lab.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || lab.difficulty === difficultyFilter;
    const matchesProvider = providerFilter === "all" || lab.supportedProviders.includes(providerFilter as "hyperv" | "vmware");
    return matchesSearch && matchesDifficulty && matchesProvider;
  });

  const filteredLogs = logs.filter((log) => (logLevelFilter === "all" || log.level === logLevelFilter) && (logActionFilter === "all" || log.action === logActionFilter));

  const saveSettings = () => {
    localStorage.setItem("ammarlab.agentUrl", settings.agentUrl);
    localStorage.setItem("ammarlab.token", settings.token);
    localStorage.setItem("ammarlab.defaultProvider", settings.defaultProvider);
    localStorage.setItem("ammarlab.theme", settings.theme);
    setMessage("Settings saved locally.");
    void detectAgent();
  };

  return <div className="app-shell"><aside className="sidebar glass-panel"> <div className="brand-block"><div className="brand-logo">A</div><div><h2>AmmarLab</h2><p>Local-first IT Labs</p></div></div><nav className="nav-list">{navItems.map((item) => <button key={item} className={`nav-item ${activePage === item ? "active" : ""}`} onClick={() => setActivePage(item)}>{item}</button>)}</nav></aside>
    <main className="dashboard"><header className="topbar glass-panel"><h2>{activePage}</h2><div className="top-actions"><span className="badge">Local Mode</span><button className="ghost" onClick={() => void detectAgent()}>Detect Agent</button></div></header>{message && <div className="toast ok">{message}</div>}{error && <div className="toast err">{error}</div>}

      {activePage === "Dashboard" && <><section className="hero glass-panel"><div><h1>Launch hands-on IT labs locally</h1><p>Practice enterprise IT skills using safe local mock lab orchestration with premium local-first workflows.</p><div className="actions"><button onClick={() => setActivePage("Lab Catalog")}>Browse Labs</button><button className="ghost" onClick={() => setActivePage("Lab Runner")}>Open Runner</button></div><div className="hero-badges"><span>100% Local</span><span>Offline First</span><span>Mock Runtime</span></div></div><div className="hero-glow"><p>Active labs: {statuses.filter((s) => s.state === "running").length} / {labs.length}</p></div></section>
      <section className="status-grid">{["Local Agent", "Hyper-V", "VMware", "Labs Loaded"].map((x, i) => <article key={x} className="glass-panel status-card"><h3>{x}</h3><p className={i === 0 ? (online ? "online" : "offline") : ""}>{i === 0 ? (online ? "Online" : "Offline") : i === 1 ? (providers.find((p) => p.provider === "hyperv")?.detected ? "Detected" : "Not detected") : i === 2 ? (providers.find((p) => p.provider === "vmware")?.detected ? "Detected" : "Not detected") : labs.length}</p></article>)}</section></>}

      {activePage === "Lab Catalog" && <section className="glass-panel page"><div className="filters"><input placeholder="Search labs..." value={search} onChange={(e) => setSearch(e.target.value)} /><select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}><option value="all">All difficulty</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}><option value="all">All providers</option><option value="hyperv">Hyper-V</option><option value="vmware">VMware</option></select></div><div className="labs-grid">{filteredLabs.map((lab) => <article className="lab-card" key={lab.id}><h3>{prettyName[lab.id] ?? lab.title}</h3><p>{lab.description}</p><div className="lab-meta"><span>{lab.difficulty}</span><span>{minutesToDuration(lab.estimatedDurationMinutes)}</span><span>{lab.requiredRamGb}GB RAM</span><span>{lab.requiredCpuCores} vCPU</span><span>{lab.requiredDiskGb}GB Disk</span></div><div className="provider-badges">{lab.supportedProviders.map((p) => <span key={p}>{p}</span>)}</div><div className="actions"><button onClick={() => { setSelectedLabId(lab.id); setActivePage("Lab Detail"); }}>View Details</button><button className="ghost" onClick={() => void runAction("start", lab.id)}>Start Lab</button></div></article>)}</div></section>}

      {activePage === "My Labs" && <section className="glass-panel page">{labs.map((lab) => { const status = statuses.find((s) => s.labId === lab.id); return <article key={lab.id} className="list-row"><div><h3>{lab.title}</h3><p>Status: <span className="badge">{status?.state ?? "idle"}</span></p></div><div className="actions"><button onClick={() => void runAction("start", lab.id)}>Start</button><button className="ghost" onClick={() => void runAction("stop", lab.id)}>Stop</button><button className="ghost" onClick={() => void runAction("reset", lab.id)}>Reset</button><button className="ghost" onClick={() => { setSelectedLabId(lab.id); setActivePage("Lab Runner"); }}>Open Runner</button></div></article>;})}</section>}

      {activePage === "Lab Detail" && <section className="glass-panel page">{selectedLab ? <><h2>{selectedLab.title}</h2><p>{selectedLab.description}</p><p>Difficulty: {selectedLab.difficulty} • Duration: {minutesToDuration(selectedLab.estimatedDurationMinutes)}</p><p>Requirements: {selectedLab.requiredRamGb}GB RAM / {selectedLab.requiredCpuCores} vCPU / {selectedLab.requiredDiskGb}GB Disk</p><p>Supported: {selectedLab.supportedProviders.join(", ")}</p><h3>VM List</h3><ul>{selectedLab.vms.map((vm) => <li key={vm.id}>{vm.name} ({vm.os}) - {vm.ramGb}GB/{vm.cpuCores} CPU/{vm.diskGb}GB</li>)}</ul><h3>Snapshots</h3><ul>{selectedLab.snapshots.map((s) => <li key={s}>{s}</li>)}</ul><h3>Student Instructions</h3><ol>{selectedLab.studentInstructions.map((i) => <li key={i}>{i}</li>)}</ol><div className="actions"><button onClick={() => void runAction("start")}>Start Lab</button><button className="ghost" onClick={() => setActivePage("Lab Runner")}>Open Lab Runner</button><button className="ghost" onClick={() => void runAction("import")}>Import Lab</button></div></> : <div className="empty">Select a lab from Lab Catalog to view details.</div>}</section>}

      {activePage === "Lab Runner" && <section className="glass-panel page">{selectedLab ? <><h2>{selectedLab.title}</h2><p>State: <span className="badge">{selectedStatus?.state ?? "idle"}</span></p><ul className="vm-list">{selectedStatus?.vmStatuses.map((vm) => <li key={vm.vmId}><span>{vm.vmId}</span><span>{vm.state}</span></li>)}</ul><div className="actions"><button disabled={busyAction !== ""} onClick={() => void runAction("start")}>Start</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("stop")}>Stop</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("reset")}>Reset</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("import")}>Import</button></div><h3>Latest Logs</h3><ul>{logs.filter((l) => l.labId === selectedLab.id).slice(0, 8).map((log) => <li key={log.id}>{log.level} - {log.action} - {log.message}</li>)}</ul></> : <div className="empty">Choose a lab from catalog to use Lab Runner.</div>}</section>}

      {activePage === "Provider Detection" && <section className="glass-panel page"><p className="hint">Mock detection — real provider integration pending</p>{providers.map((provider) => <article className="list-row" key={provider.provider}><div><h3>{provider.provider.toUpperCase()}</h3><p>{provider.detected ? "Detected" : "Not detected"} • {provider.note}</p></div></article>)}<button onClick={() => void detectProviders()}>Detect Providers / Scan Again</button></section>}

      {activePage === "Local Agent Setup" && <section className="glass-panel page"><p>Local Agent runs at 127.0.0.1:4788 and serves portal-only local mock operations.</p><p>Status: <span className={online ? "online" : "offline"}>{online ? "Online" : "Offline"}</span></p><p>Token: {settings.token ? "Configured" : "Missing"}</p><ul><li>install dependencies</li><li>start local agent</li><li>verify /health</li><li>detect providers</li></ul><div className="cmds"><code>npm install</code><code>npm run dev:agent</code><code>npm run dev:portal</code></div></section>}

      {activePage === "Logs" && <section className="glass-panel page"><div className="filters"><select value={logLevelFilter} onChange={(e) => setLogLevelFilter(e.target.value)}><option value="all">All levels</option><option value="info">info</option><option value="error">error</option></select><select value={logActionFilter} onChange={(e) => setLogActionFilter(e.target.value)}><option value="all">All actions</option><option value="start">start</option><option value="stop">stop</option><option value="reset">reset</option><option value="import">import</option><option value="agent">agent</option></select><button className="ghost" onClick={() => void loadLogs()}>Refresh Logs</button></div><div>{filteredLogs.map((log) => <div key={log.id} className="table-row"><span>{new Date(log.timestampIso).toLocaleString()}</span><span>{log.level}</span><span>{log.action}</span><span>{log.labId ?? "n/a"}</span><span>{log.provider}</span><span>{log.result}</span><span>{log.message}</span></div>)}</div></section>}

      {activePage === "Troubleshooting" && <section className="glass-panel page"><h3>Common local setup issues</h3><ul><li><strong>Agent offline</strong>: Start with <code>npm run dev:agent</code>.</li><li><strong>Wrong token</strong>: Update token in Settings to match local agent env.</li><li><strong>Port 4788 used</strong>: Stop conflicting process then retry.</li><li><strong>npm install problems</strong>: Remove node_modules and reinstall.</li><li><strong>Hyper-V not detected</strong>: Mock status only for now.</li><li><strong>VMware/vmrun not detected</strong>: Mock status only for now.</li><li><strong>Labs folder missing</strong>: Ensure <code>labs/</code> exists with lab manifests.</li></ul></section>}

      {activePage === "Settings" && <section className="glass-panel page"><label>Agent URL<input value={settings.agentUrl} onChange={(e) => setSettings({ ...settings, agentUrl: e.target.value })} /></label><label>Local token<input value={settings.token} onChange={(e) => setSettings({ ...settings, token: e.target.value })} /></label><label>Default provider<select value={settings.defaultProvider} onChange={(e) => setSettings({ ...settings, defaultProvider: e.target.value })}><option value="hyperv">Hyper-V</option><option value="vmware">VMware</option></select></label><label>Theme<select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })}><option value="premium-dark">Premium Dark (placeholder)</option></select></label><button onClick={saveSettings}>Save Settings</button></section>}

    </main></div>;
}
