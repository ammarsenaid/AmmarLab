import { useEffect, useMemo, useState } from "react";
import type { AgentLogEntry, Lab, LabStatus, ProviderStatus } from "@ammarlab/shared";

type ActionType = "start" | "stop" | "reset" | "import";

const navItems = [
  "Dashboard",
  "Lab Catalog",
  "My Labs",
  "Provider Detection",
  "Local Agent Setup",
  "Logs",
  "Troubleshooting",
  "Settings"
];

const token = "replace-with-local-token";
const base = "http://127.0.0.1:4788";

const prettyName: Record<string, string> = {
  "linux-basics": "Linux Basics",
  "windows-server-basics": "Windows Server Basics",
  "active-directory-beginner": "Active Directory Beginner"
};

const labMeta: Record<string, { icon: string; duration: string; ram: string }> = {
  "linux-basics": { icon: "🐧", duration: "1h 30m", ram: "4 GB" },
  "windows-server-basics": { icon: "🪟", duration: "2h 15m", ram: "8 GB" },
  "active-directory-beginner": { icon: "🔷", duration: "2h 30m", ram: "10 GB" }
};

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
    const res = await fetch(`${base}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", "x-ammarlab-token": token, ...(opts?.headers ?? {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data;
  }

  const detectProviders = async () => setProviders(await call("/providers"));
  const loadLabs = async () => setLabs(await call("/labs"));
  const loadStatuses = async () => setStatuses(await call("/labs/status"));
  const loadLogs = async () => setLogs(await call("/logs"));

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

  const selectedLab = useMemo(() => labs.find((l) => l.id === selectedLabId) ?? labs[0], [labs, selectedLabId]);
  const selectedStatus = useMemo(() => statuses.find((s) => s.labId === selectedLab?.id), [statuses, selectedLab]);

  useEffect(() => {
    void detectAgent();
  }, []);

  useEffect(() => {
    if (labs.length && !selectedLabId) setSelectedLabId(labs[0].id);
  }, [labs, selectedLabId]);

  const runAction = async (action: ActionType) => {
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

  const topLabs = labs.slice(0, 3);
  const cpuPercent = Math.min(90, Math.max(15, statuses.filter((s) => s.state === "running").length * 24));
  const ramPercent = Math.min(88, Math.max(20, statuses.filter((s) => s.state !== "idle").length * 26));
  const diskPercent = 48;

  return (
    <div className="app-shell">
      <aside className="sidebar glass-panel">
        <div className="brand-block">
          <div className="brand-logo">A</div>
          <div>
            <h2>AmmarLab</h2>
            <p>Local-first IT Labs</p>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item} className={`nav-item ${activePage === item ? "active" : ""}`} onClick={() => setActivePage(item)}>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-status glass-subpanel">
            <p>Local Agent</p>
            <strong className={online ? "online" : "offline"}>{online ? "Online" : "Offline"}</strong>
            <span>v1.2.0</span>
          </div>
          <div className="profile glass-subpanel">
            <div className="avatar">AS</div>
            <div><strong>Ammar Shah</strong><p>Student</p></div>
          </div>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar glass-panel">
          <div className="search-wrap"><input placeholder="Search labs, topics, or tools..." /></div>
          <div className="top-actions"><span className="badge">Local Mode</span><span>❔</span><span>🔔</span><span>⚙️</span></div>
        </header>

        {message && <div className="toast ok">{message}</div>}
        {error && <div className="toast err">{error}</div>}

        <section className="hero glass-panel">
          <div>
            <h1>Launch hands-on IT labs locally</h1>
            <p>Practice Windows Server, Active Directory, Linux, PowerShell and networking labs on your own machine using Hyper-V or VMware Workstation.</p>
            <div className="actions"><button onClick={() => setActivePage("Lab Catalog")}>Start a Lab</button><button className="ghost" onClick={() => void runAction("import")} disabled={!online || busyAction !== ""}>Import Lab</button></div>
            <div className="hero-badges"><span>100% Local</span><span>Offline First</span><span>Privacy Focused</span></div>
          </div>
          <div className="hero-glow" />
        </section>

        {!online && <div className="offline-panel glass-panel"><h3>Local Agent Offline</h3><p>The local agent is not reachable at 127.0.0.1:4788. Start it and retry detection.</p><button onClick={() => void detectAgent()}>Retry Detect Agent</button></div>}

        <section className="status-grid">
          <article className="glass-panel status-card"><h3>Local Agent</h3><p className={online ? "online" : "offline"}>{online ? "Online" : "Offline"}</p><small>Mode: Local only</small></article>
          <article className="glass-panel status-card"><h3>Hyper-V</h3><p className={providers.find((p) => p.provider.toLowerCase().includes("hyper"))?.detected ? "online" : "offline"}>{providers.find((p) => p.provider.toLowerCase().includes("hyper"))?.detected ? "Detected" : "Not detected"}</p></article>
          <article className="glass-panel status-card"><h3>VMware Workstation</h3><p className={providers.find((p) => p.provider.toLowerCase().includes("vmware"))?.detected ? "online" : "offline"}>{providers.find((p) => p.provider.toLowerCase().includes("vmware"))?.detected ? "Detected" : "Not detected"}</p></article>
          <article className="glass-panel status-card"><h3>System Resources</h3><div className="resource"><span>CPU</span><progress max={100} value={cpuPercent} /></div><div className="resource"><span>RAM</span><progress max={100} value={ramPercent} /></div><div className="resource"><span>Disk</span><progress max={100} value={diskPercent} /></div></article>
        </section>

        <section className="labs-section glass-panel">
          <div className="section-head"><h2>Featured Labs</h2><button className="ghost" onClick={() => setActivePage("Lab Catalog")}>View all</button></div>
          <div className="labs-grid">
            {topLabs.map((lab) => {
              const meta = labMeta[lab.id] ?? { icon: "🧪", duration: "~2h", ram: "6 GB" };
              return (
                <article key={lab.id} className={`lab-card ${selectedLab?.id === lab.id ? "selected" : ""}`}>
                  <div className="lab-icon">{meta.icon}</div>
                  <h3>{prettyName[lab.id] ?? lab.title}</h3>
                  <p>{lab.description}</p>
                  <div className="lab-meta"><span>{lab.difficulty}</span><span>{meta.duration}</span><span>{meta.ram} RAM</span></div>
                  <div className="provider-badges"><span>Hyper-V</span><span>VMware</span></div>
                  <button onClick={() => setSelectedLabId(lab.id)}>Start Lab</button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="lower-grid">
          {selectedLab && (
            <article className="glass-panel">
              <h2>Lab Session</h2>
              <p><strong>{prettyName[selectedLab.id] ?? selectedLab.title}</strong></p>
              <p>State: <span className="badge">{selectedStatus?.state ?? "idle"}</span></p>
              <ul className="vm-list">{selectedStatus?.vmStatuses.map((vm) => <li key={vm.vmId}><span>{vm.vmId}</span><span>{vm.state}</span></li>)}</ul>
              <div className="actions"><button disabled={!online || busyAction !== ""} onClick={() => void runAction("start")}>{busyAction === "start" ? "Starting..." : "Start Lab"}</button><button className="ghost" disabled={!online || busyAction !== ""} onClick={() => void runAction("stop")}>{busyAction === "stop" ? "Stopping..." : "Stop Lab"}</button><button className="ghost" disabled={!online || busyAction !== ""} onClick={() => void runAction("reset")}>{busyAction === "reset" ? "Resetting..." : "Reset Lab"}</button><button className="ghost" disabled={!online || busyAction !== ""} onClick={() => void runAction("import")}>{busyAction === "import" ? "Importing..." : "Import Lab"}</button></div>
            </article>
          )}

          <article className="glass-panel">
            <h2>Recent Activity</h2>
            <ul className="logs-list">
              {logs.slice(0, 8).map((log) => (
                <li key={log.id}><span>{log.action}</span><span>{prettyName[log.labId ?? ""] ?? log.labId ?? "n/a"}</span><span>{new Date(log.timestampIso).toLocaleTimeString()}</span><span className={log.result === "success" ? "online" : "offline"}>{log.level}/{log.result}</span></li>
              ))}
            </ul>
            <div className="actions"><button className="ghost" onClick={() => void loadLogs()}>Refresh Logs</button><button className="ghost" onClick={() => void detectProviders()}>Detect Providers</button><button className="ghost" onClick={() => void detectAgent()}>Detect Agent</button><button className="ghost" onClick={() => void refreshAll()} disabled={!online}>Refresh All</button></div>
          </article>
        </section>
      </main>
    </div>
  );
}
