import { providerStateLabel } from "../utils/providerStatus";
import type { ProviderStatus } from "@ammarlab/shared";

export function ProviderDetectionPage({ providers, onDetect }: { providers: ProviderStatus[]; onDetect: ()=>void }) {
  return <section className="glass-panel page"><h3>Provider Detection</h3><div className="status-grid">{providers.map((p)=><article className="stat-card" key={p.provider}><h4>{p.provider}</h4><p><strong>{providerStateLabel(p.state)}</strong> — {p.message}</p><p>{p.note}</p><ul>{p.details.map((d)=><li key={d.key}>{d.key}: {d.value}</li>)}</ul></article>)}</div><button onClick={onDetect}>Scan Again</button></section>;
}
