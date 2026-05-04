import type { AgentLogEntry, Lab, LabStatus, ProviderStatus } from "@ammarlab/shared";

export type ActionType = "start" | "stop" | "reset" | "import";
export type PageKey =
  | "Dashboard"
  | "Lab Catalog"
  | "My Labs"
  | "Lab Detail"
  | "Lab Runner"
  | "Provider Detection"
  | "Local Agent Setup"
  | "Logs"
  | "Troubleshooting"
  | "Settings";

export const navItems: PageKey[] = ["Dashboard", "Lab Catalog", "My Labs", "Lab Detail", "Lab Runner", "Provider Detection", "Local Agent Setup", "Logs", "Troubleshooting", "Settings"];

export const getSelectedLab = (labs: Lab[], selectedLabId: string) => labs.find((l) => l.id === selectedLabId) ?? null;
export const getSelectedStatus = (statuses: LabStatus[], selectedLabId?: string) => statuses.find((s) => s.labId === selectedLabId);
export const getRunningLab = (statuses: LabStatus[]) => statuses.find((s) => s.state === "running");
export const getRunningLabTitle = (labs: Lab[], statuses: LabStatus[]) => {
  const running = getRunningLab(statuses);
  return labs.find((l) => l.id === running?.labId)?.title;
};

export const filterLabs = (labs: Lab[], search: string, difficultyFilter: string, providerFilter: string, sortBy: string) =>
  labs
    .filter((lab) => {
      const matchesSearch = `${lab.title} ${lab.description}`.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty = difficultyFilter === "all" || lab.difficulty === difficultyFilter;
      const matchesProvider = providerFilter === "all" || lab.supportedProviders.includes(providerFilter as "hyperv" | "vmware");
      return matchesSearch && matchesDifficulty && matchesProvider;
    })
    .sort((a, b) =>
      sortBy === "duration"
        ? a.estimatedDurationMinutes - b.estimatedDurationMinutes
        : sortBy === "difficulty"
          ? a.difficulty.localeCompare(b.difficulty)
          : a.title.localeCompare(b.title),
    );

export const filterLogs = (logs: AgentLogEntry[], level: string) => logs.filter((log) => level === "all" || log.level === level);
export const getSelectedLabLogs = (logs: AgentLogEntry[], labId?: string) => logs.filter((l) => l.labId === labId).slice(0, 8);
export const getProviderDetected = (providers: ProviderStatus[], provider: "hyperv" | "vmware") => providers.find((p) => p.provider === provider)?.detected ?? false;
