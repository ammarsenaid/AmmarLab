import type { AgentLogEntry, Lab, LabStatus, ProviderStatus } from "@ammarlab/shared";

type ClientConfig = { agentUrl: string; localToken: string };

export const createLocalAgentClient = (config: ClientConfig) => {
  const call = async <T>(path: string, opts?: RequestInit): Promise<T> => {
    const res = await fetch(`${config.agentUrl}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "x-ammarlab-token": config.localToken,
        ...(opts?.headers ?? {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`);
    return data as T;
  };

  return {
    getHealth: () => call<{ ok: boolean }>("/health"),
    getProviders: () => call<ProviderStatus[]>("/providers"),
        getLabs: () => call<Lab[]>("/labs"),
    getLabStatus: () => call<LabStatus[]>("/labs/status"),
    startLab: (labId: string) => call<{ message: string }>("/labs/start", { method: "POST", body: JSON.stringify({ labId }) }),
    stopLab: (labId: string) => call<{ message: string }>("/labs/stop", { method: "POST", body: JSON.stringify({ labId }) }),
    resetLab: (labId: string) => call<{ message: string }>("/labs/reset", { method: "POST", body: JSON.stringify({ labId }) }),
    importLab: (labId: string) => call<{ message: string }>("/labs/import", { method: "POST", body: JSON.stringify({ labId }) }),
    getLogs: () => call<AgentLogEntry[]>("/logs"),
  };
};
