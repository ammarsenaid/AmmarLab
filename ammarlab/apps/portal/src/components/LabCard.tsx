import type { ReactNode } from "react";
import type { Lab } from "@ammarlab/shared";
import { minutesToDuration } from "../utils/formatters";

export function LabCard({ lab, actions }: { lab: Lab; actions: ReactNode }) {
  return <article className="lab-card"><h3>{lab.title}</h3><p>{lab.description}</p><div className="lab-meta"><span className="badge">{lab.difficulty}</span><span>{minutesToDuration(lab.estimatedDurationMinutes)}</span><span>{lab.vms.length} VM(s)</span><span>{lab.requiredRamGb}GB RAM</span><span>{lab.requiredCpuCores} vCPU</span><span>{lab.requiredDiskGb}GB Disk</span></div><div className="provider-badges">{lab.supportedProviders.map((p) => <span className="badge" key={p}>{p}</span>)}</div>{actions}</article>;
}
