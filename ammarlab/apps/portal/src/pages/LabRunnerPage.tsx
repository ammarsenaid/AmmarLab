import type { AgentLogEntry, Lab, LabStatus } from "@ammarlab/shared";
import { EmptyState } from "../components/EmptyState";
import { LogList } from "../components/LogList";
import { LabStatusPill } from "../components/LabStatusPill";
import { VmStatusCard } from "../components/VmStatusCard";

export function LabRunnerPage({ selectedLab, selectedStatus, busy, logs, onStart, onStop, onReset, onImport, onRefresh, onGoCatalog }: { selectedLab: Lab | null; selectedStatus?: LabStatus; busy:boolean; logs: AgentLogEntry[]; onStart: ()=>void; onStop: ()=>void; onReset: ()=>void; onImport: ()=>void; onRefresh: ()=>void; onGoCatalog: ()=>void; }) {
if(!selectedLab) return <section className="glass-panel page"><EmptyState><p>No lab selected for runner.</p><button onClick={onGoCatalog}>Choose Lab</button></EmptyState></section>;
return <section className="glass-panel page"><h2>{selectedLab.title}</h2><p>Lab state: <LabStatusPill state={selectedStatus?.state ?? "idle"} /></p><div className="actions"><button disabled={busy} onClick={onStart}>Start Lab</button><button className="ghost" disabled={busy} onClick={onStop}>Stop Lab</button><button className="ghost" disabled={busy} onClick={onReset}>Reset Lab</button><button className="ghost" disabled={busy} onClick={onImport}>Import Lab</button><button className="ghost" onClick={onRefresh}>Refresh Status</button></div><div className="vm-grid">{selectedLab.vms.map((vm)=><VmStatusCard key={vm.id} vm={vm} state={selectedStatus?.vmStatuses.find((st)=>st.vmId===vm.id)?.state ?? "idle"} />)}</div><h3>Latest logs</h3><LogList logs={logs} shortTime /></section>; }
