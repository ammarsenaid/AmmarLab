import { useEffect, useState } from "react";
import type { Lab, ProviderStatus } from "@ammarlab/shared";

const pages = ["Dashboard","Lab Catalog","Lab Detail","Lab Runner","Provider Detection","Local Agent Setup","Troubleshooting","Logs","Settings"];
const token = "replace-with-local-token";
const base = "http://127.0.0.1:4788";

export function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [online, setOnline] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  async function call(path: string, opts?: RequestInit) {
    const res = await fetch(`${base}${path}`, { ...opts, headers: { "Content-Type": "application/json", "x-ammarlab-token": token, ...(opts?.headers ?? {}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  const detectAgent = async () => {
    try { await call("/health"); setOnline(true); setLogs((l) => ["Agent detected", ...l]); } catch { setOnline(false); setLogs((l) => ["Agent unreachable", ...l]); }
  };
  const detectProviders = async () => { const p = await call("/providers"); setProviders(p); setLogs((l) => ["Providers refreshed", ...l]); };
  const loadLabs = async () => { const l = await call("/labs"); setLabs(l); setLogs((x) => ["Labs loaded", ...x]); };
  const runAction = async (action: "start"|"stop"|"reset", labId: string) => {
    const result = await call(`/labs/${action}`, { method: "POST", body: JSON.stringify({ labId }) });
    setLogs((l) => [`${action} ${labId}: ${result.message}`, ...l]);
  };

  useEffect(() => { detectAgent(); }, []);

  return <div className="layout">
    <aside><h2>AmmarLab</h2>{pages.map((p)=><button key={p} onClick={()=>setActivePage(p)}>{p}</button>)}</aside>
    <main>
      <h1>{activePage}</h1>
      {!online && <div className="offline">Offline: Local Agent not reachable on 127.0.0.1:4788</div>}
      <div className="actions">
        <button onClick={detectAgent}>Detect Agent</button><button onClick={detectProviders}>Detect Providers</button><button onClick={loadLabs}>Import Lab</button><button onClick={()=>setActivePage("Logs")}>View Logs</button>
      </div>
      <section className="cards">{providers.map((p)=><div className="card" key={p.provider}><h3>{p.provider}</h3><p>{p.detected?"Detected":"Missing"}</p><small>{p.note}</small></div>)}</section>
      <section className="cards">{labs.map((lab)=><div className="card" key={lab.id}><h3>{lab.title}</h3><p>{lab.description}</p><p>Difficulty: {lab.difficulty}</p><div className="actions"><button onClick={()=>runAction("start",lab.id)}>Start Lab</button><button onClick={()=>runAction("stop",lab.id)}>Stop Lab</button><button onClick={()=>runAction("reset",lab.id)}>Reset Lab</button></div></div>)}</section>
      <section><h2>Local Agent Status</h2><p>{online?"Connected":"Disconnected"}</p></section>
      <section><h2>Logs</h2><ul>{logs.slice(0,8).map((log, i)=><li key={i}>{log}</li>)}</ul></section>
    </main>
  </div>;
}
