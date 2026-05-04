export type LabProvider = "hyperv" | "vmware";

export interface VirtualMachine {
  id: string;
  name: string;
  os: string;
  ramGb: number;
  cpuCores: number;
  diskGb: number;
  snapshotName: string;
}

export interface LabManifest {
  version: string;
  instructions: string[];
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
  manifest: LabManifest;
}

export interface LabStatus {
  labId: string;
  state: "stopped" | "starting" | "running" | "stopping" | "resetting";
  activeVmIds: string[];
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
