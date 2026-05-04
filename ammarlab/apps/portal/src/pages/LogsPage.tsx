import type { AgentLogEntry, Lab } from "@ammarlab/shared";
import { EmptyState } from "../components/EmptyState";
import { LogList } from "../components/LogList";
import { PageHeader } from "../components/PageHeader";

export function LogsPage({ logs, labs, logLevelFilter, setLogLevelFilter, onRefresh }: { logs: AgentLogEntry[]; labs: Lab[]; logLevelFilter: string; setLogLevelFilter: (v: string) => void; onRefresh: () => void; }) {
  return <section className="glass-panel page"><PageHeader title="Logs" right={<div className="actions"><select value={logLevelFilter} onChange={(e) => setLogLevelFilter(e.target.value)}><option value="all">All levels</option><option value="info">Info</option><option value="error">Error</option></select><button onClick={onRefresh}>Refresh Logs</button></div>} />{logs.length ? <LogList logs={logs} labs={labs} /> : <EmptyState>No logs available yet.</EmptyState>}</section>;
}
