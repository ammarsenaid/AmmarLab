import type { Lab, ProviderStatus } from "@ammarlab/shared";
import { EmptyState } from "../components/EmptyState";
import { minutesToDuration } from "../utils/formatters";

export function LabDetailPage({ selectedLab, online, providers, onStart, onImport, onOpenRunner, onGoCatalog }: { selectedLab: Lab | null; online:boolean; providers: ProviderStatus[]; onStart: ()=>void; onImport: ()=>void; onOpenRunner: ()=>void; onGoCatalog: ()=>void; }) {
  if (!selectedLab) return <section className="glass-panel page"><EmptyState><p>No lab selected yet.</p><button onClick={onGoCatalog}>Go to Lab Catalog</button></EmptyState></section>;
  return <section className="glass-panel page"><h2>{selectedLab.title}</h2><p>{selectedLab.description}</p><div className="lab-meta"><span className="badge">{selectedLab.difficulty}</span><span>{minutesToDuration(selectedLab.estimatedDurationMinutes)}</span><span>Providers: {selectedLab.supportedProviders.join(", ")}</span></div><ul><li>Local Agent: <strong>{online?"Online":"Offline"}</strong></li><li>Provider detected: <strong>{selectedLab.supportedProviders.some((p)=>providers.some((x)=>x.provider===p&&x.detected))?"Yes":"No"}</strong></li></ul><div className="actions"><button onClick={onStart}>Start Lab</button><button className="ghost" onClick={onImport}>Import Lab</button><button className="ghost" onClick={onOpenRunner}>Open Lab Runner</button></div></section>;
}
