import type { ProviderState } from "@ammarlab/shared";

export const providerStateLabel = (state: ProviderState): string => {
  switch (state) {
    case "ready": return "Ready";
    case "not_installed": return "Not installed";
    case "not_enabled": return "Not enabled";
    case "module_only": return "Module only";
    case "permission_required": return "Admin required";
    case "unknown": return "Unknown";
    case "detected": return "Detected";
    case "not_detected": return "Not detected";
    case "unavailable": return "Unavailable";
    default: return state;
  }
};
