export type AppSettings = {
  agentUrl: string;
  localToken: string;
  defaultProvider: "auto" | "hyperv" | "vmware";
  uiDensity: "comfortable" | "compact";
  vmrunPath: string;
};

const DEFAULT_BASE = "http://127.0.0.1:4788";
const DEFAULT_TOKEN = "replace-with-local-token";
export const DEFAULT_SETTINGS: AppSettings = {
  agentUrl: DEFAULT_BASE,
  localToken: DEFAULT_TOKEN,
  defaultProvider: "auto",
  uiDensity: "comfortable",
  vmrunPath: "",
};

export const settingsStore = {
  get(): AppSettings {
    return {
      agentUrl: localStorage.getItem("ammarlab.agentUrl") ?? DEFAULT_SETTINGS.agentUrl,
      localToken: localStorage.getItem("ammarlab.token") ?? DEFAULT_SETTINGS.localToken,
      defaultProvider: (localStorage.getItem("ammarlab.defaultProvider") as AppSettings["defaultProvider"]) ?? DEFAULT_SETTINGS.defaultProvider,
      uiDensity: (localStorage.getItem("ammarlab.density") as AppSettings["uiDensity"]) ?? DEFAULT_SETTINGS.uiDensity,
      vmrunPath: localStorage.getItem("ammarlab.vmrunPath") ?? DEFAULT_SETTINGS.vmrunPath,
    };
  },
  set(settings: AppSettings) {
    localStorage.setItem("ammarlab.agentUrl", settings.agentUrl);
    localStorage.setItem("ammarlab.token", settings.localToken);
    localStorage.setItem("ammarlab.defaultProvider", settings.defaultProvider);
    localStorage.setItem("ammarlab.density", settings.uiDensity);
    localStorage.setItem("ammarlab.vmrunPath", settings.vmrunPath);
  },
  reset() {
    localStorage.removeItem("ammarlab.agentUrl");
    localStorage.removeItem("ammarlab.token");
    localStorage.removeItem("ammarlab.defaultProvider");
    localStorage.removeItem("ammarlab.density");
    localStorage.removeItem("ammarlab.vmrunPath");
  },
};

export const isDefaultToken = (token: string) => token === DEFAULT_TOKEN;
