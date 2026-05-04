import { useEffect, useMemo, useState } from "react";
import type { AgentLogEntry, Lab, LabStatus, ProviderStatus } from "@ammarlab/shared";

type ActionType = "start" | "stop" | "reset" | "import";
type PageKey = "Dashboard" | "Lab Catalog" | "My Labs" | "Lab Detail" | "Lab Runner" | "Provider Detection" | "Local Agent Setup" | "Logs" | "Troubleshooting" | "Settings";

type AppSettings = {
  agentUrl: string;
  token: string;
  defaultProvider: "auto" | "hyperv" | "vmware";
  density: "comfortable" | "compact";
};

const navItems: PageKey[] = ["Dashboard", "Lab Catalog", "My Labs", "Lab Detail", "Lab Runner", "Provider Detection", "Local Agent Setup", "Logs", "Troubleshooting", "Settings"];
const DEFAULT_BASE = "http://127.0.0.1:4788";
const DEFAULT_TOKEN = "replace-with-local-token";
const DEFAULT_SETTINGS: AppSettings = { agentUrl: DEFAULT_BASE, token: DEFAULT_TOKEN, defaultProvider: "auto", density: "comfortable" };
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
  const [settings, setSettings] = useState<AppSettings>(() => ({
    agentUrl: (localStorage.getItem("ammarlab.agentUrl") as string) ?? DEFAULT_SETTINGS.agentUrl,
    token: (localStorage.getItem("ammarlab.token") as string) ?? DEFAULT_SETTINGS.token,
    defaultProvider: (localStorage.getItem("ammarlab.defaultProvider") as AppSettings["defaultProvider"]) ?? DEFAULT_SETTINGS.defaultProvider,
    density: (localStorage.getItem("ammarlab.density") as AppSettings["density"]) ?? DEFAULT_SETTINGS.density,
  }));
  const [draftSettings, setDraftSettings] = useState(settings);

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
    try {
      await call("/health");
      setOnline(true);
      setError("");
      await Promise.all([loadLabs(), loadStatuses(), loadLogs(), detectProviders()]);
    } catch {
      setOnline(false);
      setError(`Local Agent is offline or unreachable on ${settings.agentUrl}.`);
    }
  };

  const selectedLab = useMemo(() => labs.find((l) => l.id === selectedLabId) ?? null, [labs, selectedLabId]);
  const selectedStatus = useMemo(() => statuses.find((s) => s.labId === selectedLab?.id), [statuses, selectedLab]);
  useEffect(() => void detectAgent(), [settings.agentUrl, settings.token]);
  useEffect(() => setDraftSettings(settings), [settings]);
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

  const filteredLogs = logs.filter((log) => logLevelFilter === "all" || log.level === logLevelFilter);
  const selectedLabLogs = logs.filter((l) => l.labId === selectedLab?.id).slice(0, 8);
  const featuredLabs = labs.slice(0, 3);
  const hyperv = providers.find((p) => p.provider === "hyperv")?.detected ?? false;
  const vmware = providers.find((p) => p.provider === "vmware")?.detected ?? false;
  const runningLab = statuses.find((s) => s.state === "running");
  const runningLabTitle = labs.find((l) => l.id === runningLab?.labId)?.title;

  const saveSettings = () => {
    setSettings(draftSettings);
    localStorage.setItem("ammarlab.agentUrl", draftSettings.agentUrl);
    localStorage.setItem("ammarlab.token", draftSettings.token);
    localStorage.setItem("ammarlab.defaultProvider", draftSettings.defaultProvider);
    localStorage.setItem("ammarlab.density", draftSettings.density);
    setMessage("Settings saved.");
  };

  const resetSettings = () => {
    setDraftSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem("ammarlab.agentUrl");
    localStorage.removeItem("ammarlab.token");
    localStorage.removeItem("ammarlab.defaultProvider");
    localStorage.removeItem("ammarlab.density");
    setMessage("Settings reset to defaults.");
  };

  return <div className={`app-shell ${settings.density === "compact" ? "compact" : ""}`}><aside className="sidebar glass-panel"><div className="brand-block"><div className="brand-logo">A</div><div><h2>AmmarLab</h2><p>Local-first IT Labs</p></div></div><nav className="nav-list">{navItems.map((item) => <button key={item} className={`nav-item ${activePage === item ? "active" : ""}`} onClick={() => setActivePage(item)}>{item}</button>)}</nav></aside>
    <main className="dashboard"><header className="topbar glass-panel"><div><h2>{activePage}</h2><p className="muted">Polished local-only training lab workspace</p></div><div className="top-actions"><span className="badge">Local Mode</span><button className="ghost" onClick={() => void detectAgent()}>Detect Agent</button></div></header>{message && <div className="toast ok">{message}</div>}{error && <div className="toast err">{error}</div>}

      {activePage === "Dashboard" && <section className="page-stack"><article className="glass-panel page hero"><h1>Launch hands-on IT labs locally</h1><p>Practice Windows Server, Active Directory, Linux, PowerShell and networking labs on your own machine using Hyper-V or VMware Workstation.</p><div className="actions"><button onClick={() => setActivePage("Lab Catalog")}>Start a Lab</button><button className="ghost" onClick={() => selectedLab && void runAction("import", selectedLab.id)}>Import Lab</button></div><div className="provider-badges"><span className="badge">100% Local</span><span className="badge">Offline First</span><span className="badge">Privacy Focused</span></div></article><div className="status-grid">{[["Local Agent", online ? "Online" : "Offline"],["Hyper-V", hyperv ? "Detected" : "Not detected"],["VMware Workstation", vmware ? "Detected" : "Not detected"],["Labs Available", String(labs.length)]].map(([k,v]) => <article className="glass-panel stat-card" key={k}><h4>{k}</h4><p>{v}</p></article>)}</div><div className="split-grid"><article className="glass-panel page"><h3>Featured Labs</h3><div className="labs-grid">{featuredLabs.map((lab) => <div className="lab-card" key={lab.id}><h4>{lab.title}</h4><p>{lab.description}</p><div className="actions"><button onClick={() => { setSelectedLabId(lab.id); setActivePage("Lab Detail"); }}>View</button><button className="ghost" onClick={() => void runAction("start", lab.id, true)}>Start</button></div></div>)}</div></article><article className="glass-panel page"><h3>Current Lab Session</h3>{runningLab ? <><p><strong>{runningLabTitle}</strong> is currently running.</p><div className="actions"><button onClick={() => void runAction("start", runningLab.labId)}>Start</button><button className="ghost" onClick={() => void runAction("stop", runningLab.labId)}>Stop</button><button className="ghost" onClick={() => void runAction("reset", runningLab.labId)}>Reset</button></div></> : <div className="empty">No active lab session. Start one from the catalog.</div>}</article></div><article className="glass-panel page"><h3>Recent Activity</h3><div>{logs.slice(0, 8).map((log) => <div className="table-row logs" key={log.id}><span>{new Date(log.timestampIso).toLocaleString()}</span><span>{log.level}</span><span>{log.action}</span><span>{log.provider ?? "-"}</span><span>{log.message}</span></div>)}</div></article></section>}


      {activePage === "Lab Catalog" && <section className="glass-panel page"><div className="filters"><input placeholder="Search title or description..." value={search} onChange={(e) => setSearch(e.target.value)} /><select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}><option value="all">All difficulty</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}><option value="all">All providers</option><option value="hyperv">Hyper-V</option><option value="vmware">VMware</option></select><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="title">Sort: Title</option><option value="duration">Sort: Duration</option><option value="difficulty">Sort: Difficulty</option></select></div><div className="labs-grid">{filteredLabs.map((lab) => <article className="lab-card" key={lab.id}><h3>{lab.title}</h3><p>{lab.description}</p><div className="lab-meta"><span className="badge">{lab.difficulty}</span><span>{minutesToDuration(lab.estimatedDurationMinutes)}</span><span>{lab.vms.length} VM(s)</span><span>{lab.requiredRamGb}GB RAM</span><span>{lab.requiredCpuCores} vCPU</span><span>{lab.requiredDiskGb}GB Disk</span></div><div className="provider-badges">{lab.supportedProviders.map((p) => <span className="badge" key={p}>{p}</span>)}</div><div className="actions"><button onClick={() => void runAction("start", lab.id, true)}>Start Lab</button><button className="ghost" onClick={() => { setSelectedLabId(lab.id); setActivePage("Lab Detail"); }}>View Details</button></div></article>)}</div>{!filteredLabs.length && <div className="empty">No labs match your current search and filters.</div>}</section>}

      {activePage === "Lab Detail" && <section className="glass-panel page">{selectedLab ? <><h2>{selectedLab.title}</h2><p>{selectedLab.description}</p><div className="lab-meta"><span className="badge">{selectedLab.difficulty}</span><span>{minutesToDuration(selectedLab.estimatedDurationMinutes)}</span><span>{selectedLab.requiredRamGb}GB RAM / {selectedLab.requiredCpuCores} vCPU / {selectedLab.requiredDiskGb}GB Disk</span><span>Providers: {selectedLab.supportedProviders.join(", ")}</span></div><div className="split"><div><h3>VM List</h3>{selectedLab.vms.map((vm) => <div className="table-row" key={vm.id}><span>{vm.name}</span><span>{vm.os}</span><span>{vm.ramGb}GB</span><span>{vm.cpuCores} vCPU</span><span>{vm.diskGb}GB</span></div>)}</div><div><h3>Readiness checklist</h3><ul><li>Local Agent: <strong className={online ? "online" : "offline"}>{online ? "Online" : "Offline"}</strong></li><li>Provider detected: <strong>{selectedLab.supportedProviders.some((p) => providers.some((x) => x.provider === p && x.detected)) ? "Yes" : "No"}</strong></li><li>Enough RAM: <strong>Placeholder OK</strong></li><li>Lab manifest loaded: <strong>{selectedLab ? "Yes" : "No"}</strong></li></ul></div></div><h3>Snapshots / checkpoints</h3><ul>{selectedLab.snapshots.map((s) => <li key={s}>{s}</li>)}</ul><h3>Student Instructions</h3><ol>{selectedLab.studentInstructions.map((i) => <li key={i}>{i}</li>)}</ol><div className="actions"><button onClick={() => void runAction("start")}>Start Lab</button><button className="ghost" onClick={() => void runAction("import")}>Import Lab</button><button className="ghost" onClick={() => setActivePage("Lab Runner")}>Open Lab Runner</button></div></> : <div className="empty"><p>No lab selected yet.</p><button onClick={() => setActivePage("Lab Catalog")}>Go to Lab Catalog</button></div>}</section>}

      {activePage === "Lab Runner" && <section className="glass-panel page">{selectedLab ? <><h2>{selectedLab.title}</h2><p>Lab state: <span className={`badge status-${selectedStatus?.state ?? "idle"}`}>{selectedStatus?.state ?? "idle"}</span></p><div className="actions"><button disabled={busyAction !== ""} onClick={() => void runAction("start")}>Start Lab</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("stop")}>Stop Lab</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("reset")}>Reset Lab</button><button className="ghost" disabled={busyAction !== ""} onClick={() => void runAction("import")}>Import Lab</button><button className="ghost" onClick={() => void Promise.all([loadStatuses(), loadLogs()])}>Refresh Status</button></div><div className="vm-grid">{selectedLab.vms.map((vm) => { const vmState = selectedStatus?.vmStatuses.find((st) => st.vmId === vm.id)?.state ?? "idle"; return <article key={vm.id} className="lab-card"><h4>{vm.name}</h4><p>{vm.os}</p><p>{vm.ramGb}GB RAM • {vm.cpuCores} vCPU • {vm.diskGb}GB Disk</p><span className={`badge status-${vmState}`}>{vmState}</span></article>; })}</div><h3>Latest logs</h3><div>{selectedLabLogs.map((log) => <div className="table-row logs" key={log.id}><span>{new Date(log.timestampIso).toLocaleTimeString()}</span><span>{log.level}</span><span>{log.action}</span><span>{log.message}</span></div>)}</div></> : <div className="empty"><p>No lab selected for runner.</p><button onClick={() => setActivePage("Lab Catalog")}>Choose Lab</button></div>}</section>}
      {activePage === "My Labs" && <section className="glass-panel page"><h3>My Labs</h3>{labs.length ? <div className="labs-grid">{labs.map((lab) => { const st = statuses.find((s) => s.labId === lab.id)?.state ?? "idle"; return <article className="lab-card" key={lab.id}><h4>{lab.title}</h4><div className="lab-meta"><span className="badge">{lab.difficulty}</span><span className={`badge status-${st}`}>{st}</span><span>{lab.vms.length} VM(s)</span></div><div className="provider-badges">{lab.supportedProviders.map((p) => <span className="badge" key={p}>{p}</span>)}</div><div className="actions"><button onClick={() => void runAction("start", lab.id)}>Start</button><button className="ghost" onClick={() => void runAction("stop", lab.id)}>Stop</button><button className="ghost" onClick={() => void runAction("reset", lab.id)}>Reset</button><button className="ghost" onClick={() => { setSelectedLabId(lab.id); setActivePage("Lab Runner"); }}>Open Runner</button></div></article>; })}</div> : <div className="empty">No labs loaded yet. Import a lab to begin your local practice journey.</div>}</section>}

      {activePage === "Provider Detection" && <section className="glass-panel page"><h3>Provider Detection</h3><p className="muted">Mock detection — real provider integration pending</p><div className="status-grid">{providers.map((p) => <article className="stat-card" key={p.provider}><h4>{p.provider === "hyperv" ? "Hyper-V" : "VMware Workstation"}</h4><p>{p.detected ? "Detected" : "Not detected"}</p></article>)}</div><button onClick={() => void detectProviders()}>Detect Providers / Scan Again</button><div className="split-grid"><div className="hint"><strong>Integration roadmap</strong><ul><li>Hyper-V will use PowerShell later.</li><li>VMware Workstation will use vmrun.exe later.</li></ul></div><div className="hint"><strong>Requirements</strong><ul><li>Windows 10/11 Pro for Hyper-V</li><li>VMware Workstation installed for VMware mode</li></ul></div></div></section>}

      {activePage === "Local Agent Setup" && <section className="glass-panel page"><h3>Local Agent Setup</h3><p>Status: <span className={online ? "online" : "offline"}>{online ? "Online" : "Offline"}</span> • URL: {settings.agentUrl} • Token: {settings.token === DEFAULT_TOKEN ? "Default placeholder" : "Configured"}</p><ol><li>Install dependencies</li><li>Create .env</li><li>Run local agent</li><li>Verify /health</li><li>Run portal</li></ol><div className="commands"><code>npm install</code><code>Copy-Item apps/local-agent/.env.example apps/local-agent/.env</code><code>npm run dev:agent</code><code>npm run dev:portal</code></div><div className="hint"><strong>Troubleshooting notes:</strong><ul><li>Wrong token: ensure portal token matches local-agent .env</li><li>Port 4788 busy: free the port or update Agent URL</li><li>Agent offline: verify process and /health endpoint</li></ul></div></section>}

      {activePage === "Logs" && <section className="glass-panel page"><div className="topbar-in"><h3>Logs</h3><div className="actions"><select value={logLevelFilter} onChange={(e) => setLogLevelFilter(e.target.value)}><option value="all">All levels</option><option value="info">Info</option><option value="warn">Warn</option><option value="error">Error</option></select><button onClick={() => void loadLogs()}>Refresh Logs</button></div></div>{filteredLogs.length ? filteredLogs.map((log) => <div className="table-row logs" key={log.id}><span>{new Date(log.timestampIso).toLocaleString()}</span><span>{log.level}</span><span>{log.action}</span><span>{labs.find((l) => l.id === log.labId)?.title ?? "-"}</span><span>{log.provider ?? "-"}</span><span className={`badge status-${log.result}`}>{log.result}</span><span>{log.message}</span></div>) : <div className="empty">No logs available yet.</div>}</section>}

      {activePage === "Troubleshooting" && <section className="glass-panel page"><h3>Troubleshooting</h3><div className="labs-grid">{[
        ["Local Agent Offline","Symptom: portal cannot reach /health","Cause: local-agent not running","Fix: run npm run dev:agent and verify URL/token"],
        ["Missing or Invalid Local Token","Symptom: 401 responses","Cause: token mismatch","Fix: update token in Settings and .env"],
        ["Port 4788 Already in Use","Symptom: agent fails to start","Cause: another process on 4788","Fix: stop conflicting process or use a different port"],
        ["npm install fails","Symptom: dependency errors","Cause: node/npm mismatch or network","Fix: use supported Node version and retry clean install"],
        ["Labs folder not found","Symptom: /labs empty","Cause: missing manifests","Fix: ensure labs/*/lab.json exists"],
        ["Hyper-V not detected","Symptom: provider card shows not detected","Cause: feature disabled","Fix: enable Hyper-V (future real integration)"],
        ["VMware Workstation / vmrun not detected","Symptom: vmware unavailable","Cause: not installed","Fix: install VMware Workstation (future real integration)"],
        ["TypeScript/typecheck problems","Symptom: typecheck fails","Cause: stale dependencies or TS errors","Fix: run npm install then npm run typecheck"]
      ].map(([t,s,c,f]) => <article key={t} className="lab-card"><h4>{t}</h4><p><strong>{s}</strong></p><p>{c}</p><p>{f}</p></article>)}</div></section>}

      {activePage === "Settings" && <section className="glass-panel page"><h3>Settings</h3><div className="settings-grid"><label>Agent URL<input value={draftSettings.agentUrl} onChange={(e) => setDraftSettings({ ...draftSettings, agentUrl: e.target.value })} /></label><label>Local token<input value={draftSettings.token} onChange={(e) => setDraftSettings({ ...draftSettings, token: e.target.value })} /></label><label>Default provider<select value={draftSettings.defaultProvider} onChange={(e) => setDraftSettings({ ...draftSettings, defaultProvider: e.target.value as AppSettings["defaultProvider"] })}><option value="auto">Auto</option><option value="hyperv">Hyper-V</option><option value="vmware">VMware</option></select></label><label>UI density<select value={draftSettings.density} onChange={(e) => setDraftSettings({ ...draftSettings, density: e.target.value as AppSettings["density"] })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></div><div className="actions"><button onClick={saveSettings}>Save Settings</button><button className="ghost" onClick={resetSettings}>Reset Settings</button></div></section>}

    </main></div>;
}
