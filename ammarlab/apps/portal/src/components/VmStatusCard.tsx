import type { VirtualMachine } from "@ammarlab/shared";
import { LabStatusPill } from "./LabStatusPill";

export function VmStatusCard({ vm, state }: { vm: VirtualMachine; state: string }) {
  return <article className="lab-card"><h4>{vm.name}</h4><p>{vm.os}</p><p>{vm.ramGb}GB RAM • {vm.cpuCores} vCPU • {vm.diskGb}GB Disk</p><LabStatusPill state={state} /></article>;
}
