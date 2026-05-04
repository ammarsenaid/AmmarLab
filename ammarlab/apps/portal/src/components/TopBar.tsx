import type { PageKey } from "../utils/labUtils";

export function TopBar({ activePage, onDetectAgent }: { activePage: PageKey; onDetectAgent: () => void }) {
  return <header className="topbar glass-panel"><div><h2>{activePage}</h2><p className="muted">Polished local-only training lab workspace</p></div><div className="top-actions"><span className="badge">Local Mode</span><button className="ghost" onClick={onDetectAgent}>Detect Agent</button></div></header>;
}
