export type LabProvider = "hyperv" | "vmware";

export interface VirtualMachine {
  id: string;
  name: string;
  os: string;
  ramGb: number;
  cpuCores: number;
  diskGb: number;
}

export interface Lab {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDurationMinutes: number;
  requiredRamGb: number;
  requiredCpuCores: number;
  requiredDiskGb: number;
  supportedProviders: LabProvider[];
  vms: VirtualMachine[];
  snapshots: string[];
  studentInstructions: string[];
}

export type LabRuntimeState = "idle" | "starting" | "running" | "stopping" | "reset_in_progress" | "error";
export type VmRuntimeState = "stopped" | "running" | "resetting" | "error";

export interface VmStatus {
  vmId: string;
  state: VmRuntimeState;
}

export interface LabStatus {
  labId: string;
  state: LabRuntimeState;
  vmStatuses: VmStatus[];
  updatedAtIso: string;
}

export interface ProviderStatus {
  provider: LabProvider;
  detected: boolean;
  enabled: boolean;
  version: string | null;
  note: string;
}

export interface AgentHealth {
  healthy: boolean;
  mode: "mock" | "live";
  listenAddress: string;
  timestampIso: string;
}

export interface LabActionResult {
  success: boolean;
  action: "start" | "stop" | "reset" | "import";
  labId?: string;
  message: string;
}

export interface AgentLogEntry {
  id: string;
  timestampIso: string;
  level: "info" | "error";
  action: "start" | "stop" | "reset" | "import" | "agent";
  labId: string | null;
  provider: LabProvider | "mock";
  message: string;
  result: "success" | "error";
}
