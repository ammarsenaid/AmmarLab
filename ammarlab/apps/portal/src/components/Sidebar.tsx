import type { PageKey } from "../utils/labUtils";

export function Sidebar({ items, activePage, onSelect }: { items: PageKey[]; activePage: PageKey; onSelect: (page: PageKey) => void }) {
  return <aside className="sidebar glass-panel"><div className="brand-block"><div className="brand-logo">A</div><div><h2>AmmarLab</h2><p>Local-first IT Labs</p></div></div><nav className="nav-list">{items.map((item) => <button key={item} className={`nav-item ${activePage === item ? "active" : ""}`} onClick={() => onSelect(item)}>{item}</button>)}</nav></aside>;
}
