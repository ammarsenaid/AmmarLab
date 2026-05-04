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

export type ProviderState = "detected" | "not_detected" | "unavailable" | "permission_required" | "mock";

export interface ProviderDetectionDetail {
  key: string;
  value: string;
}

export interface ProviderStatus {
  provider: LabProvider;
  detected: boolean;
  enabled: boolean;
  state: ProviderState;
  version: string | null;
  note: string;
  message: string;
  details: ProviderDetectionDetail[];
}

export interface SystemResources {
  platform: string;
  osVersion: string;
  hostname: string;
  username: string | null;
  cpuModel: string;
  cpuLogicalCores: number;
  totalRamGb: number;
  freeRamGb: number | null;
  diskTotalGb: number | null;
  diskFreeGb: number | null;
  powerShellAvailable: boolean;
  nodeVersion: string;
  isElevated: boolean | null;
  virtualizationLikelyPresent: boolean | null;
  virtualizationHint: string;
  mocked: boolean;
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
