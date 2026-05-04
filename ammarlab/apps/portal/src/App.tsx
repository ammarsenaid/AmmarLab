import { useEffect, useMemo, useState } from "react";
import type { AgentLogEntry, Lab, LabStatus, ProviderStatus, SystemResources } from "@ammarlab/shared";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { DashboardPage } from "./pages/DashboardPage";
import { LabCatalogPage } from "./pages/LabCatalogPage";
import { MyLabsPage } from "./pages/MyLabsPage";
import { LabDetailPage } from "./pages/LabDetailPage";
import { LabRunnerPage } from "./pages/LabRunnerPage";
import { ProviderDetectionPage } from "./pages/ProviderDetectionPage";
import { LocalAgentSetupPage } from "./pages/LocalAgentSetupPage";
import { LogsPage } from "./pages/LogsPage";
import { TroubleshootingPage } from "./pages/TroubleshootingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { createLocalAgentClient } from "./services/localAgentClient";
import { DEFAULT_SETTINGS, settingsStore, type AppSettings } from "./services/settingsStore";
import { filterLabs, filterLogs, getRunningLab, getRunningLabTitle, getSelectedLab, getSelectedLabLogs, getSelectedStatus, navItems, type ActionType, type PageKey } from "./utils/labUtils";

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("Dashboard");
  const [online, setOnline] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [statuses, setStatuses] = useState<LabStatus[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [selectedLabId, setSelectedLabId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [search, setSearch] = useState(""); const [difficultyFilter, setDifficultyFilter] = useState("all"); const [providerFilter, setProviderFilter] = useState("all"); const [sortBy, setSortBy] = useState("title"); const [logLevelFilter, setLogLevelFilter] = useState("all");
  const [settings, setSettings] = useState<AppSettings>(() => settingsStore.get());
  const [draftSettings, setDraftSettings] = useState(settings);
  const client = useMemo(() => createLocalAgentClient({ agentUrl: settings.agentUrl, localToken: settings.localToken }), [settings.agentUrl, settings.localToken]);

  const loadLabs = async () => setLabs(await client.getLabs());
  const loadStatuses = async () => setStatuses(await client.getLabStatus());
  const loadLogs = async () => setLogs(await client.getLogs());
  const detectProviders = async () => setProviders(await client.getProviders());
  const loadResources = async () => setResources(await client.getSystemResources());

  const detectAgent = async () => { try { await client.getHealth(); setOnline(true); setError(""); await Promise.all([loadLabs(), loadStatuses(), loadLogs(), detectProviders(), loadResources()]); } catch { setOnline(false); setError(`Local Agent is offline or unreachable on ${settings.agentUrl}.`); } };

  useEffect(() => { void detectAgent(); }, [client]);
  useEffect(() => setDraftSettings(settings), [settings]);
  useEffect(() => { if (labs.length && !selectedLabId) setSelectedLabId(labs[0].id); }, [labs, selectedLabId]);

  const selectedLab = useMemo(() => getSelectedLab(labs, selectedLabId), [labs, selectedLabId]);
  const selectedStatus = useMemo(() => getSelectedStatus(statuses, selectedLab?.id), [statuses, selectedLab]);
  const runAction = async (action: ActionType, labId?: string, openRunner = false) => { const target = labId ?? selectedLab?.id; if (!target) return; setBusyAction(`${action}:${target}`); setSelectedLabId(target); try { const method = action === "start" ? client.startLab : action === "stop" ? client.stopLab : action === "reset" ? client.resetLab : client.importLab; const result = await method(target); setMessage(result.message); setError(""); await Promise.all([loadStatuses(), loadLogs()]); if (openRunner) setActivePage("Lab Runner"); } catch (err) { setError((err as Error).message); } finally { setBusyAction(""); } };

  const saveSettings = () => { setSettings(draftSettings); settingsStore.set(draftSettings); setMessage("Settings saved."); };
  const resetSettings = () => { setDraftSettings(DEFAULT_SETTINGS); setSettings(DEFAULT_SETTINGS); settingsStore.reset(); setMessage("Settings reset to defaults."); };

  const filteredLabs = useMemo(() => filterLabs(labs, search, difficultyFilter, providerFilter, sortBy), [labs, search, difficultyFilter, providerFilter, sortBy]);
  const filteredLogs = useMemo(() => filterLogs(logs, logLevelFilter), [logs, logLevelFilter]);

  return <div className={`app-shell ${settings.uiDensity === "compact" ? "compact" : ""}`}><Sidebar items={navItems} activePage={activePage} onSelect={setActivePage} /><main className="dashboard"><TopBar activePage={activePage} onDetectAgent={() => void detectAgent()} />{message && <div className="toast ok">{message}</div>}{error && <div className="toast err">{error}</div>}
    {activePage === "Dashboard" && <DashboardPage online={online} providers={providers} resources={resources} labs={labs} logs={logs} runningLab={getRunningLab(statuses)} runningLabTitle={getRunningLabTitle(labs, statuses)} onStart={(id)=>void runAction("start", id, true)} onStop={(id)=>void runAction("stop", id)} onReset={(id)=>void runAction("reset", id)} onViewLab={(id)=>{setSelectedLabId(id); setActivePage("Lab Detail");}} onGoCatalog={()=>setActivePage("Lab Catalog")} />}
    {activePage === "Lab Catalog" && <LabCatalogPage labs={filteredLabs} search={search} setSearch={setSearch} difficultyFilter={difficultyFilter} setDifficultyFilter={setDifficultyFilter} providerFilter={providerFilter} setProviderFilter={setProviderFilter} sortBy={sortBy} setSortBy={setSortBy} onStart={(id)=>void runAction("start", id, true)} onView={(id)=>{setSelectedLabId(id); setActivePage("Lab Detail");}} />}
    {activePage === "My Labs" && <MyLabsPage labs={labs} statuses={statuses} onStart={(id)=>void runAction("start", id)} onStop={(id)=>void runAction("stop", id)} onReset={(id)=>void runAction("reset", id)} onOpenRunner={(id)=>{setSelectedLabId(id); setActivePage("Lab Runner");}} />}
    {activePage === "Lab Detail" && <LabDetailPage selectedLab={selectedLab} online={online} providers={providers} onStart={()=>void runAction("start")} onImport={()=>void runAction("import")} onOpenRunner={()=>setActivePage("Lab Runner")} onGoCatalog={()=>setActivePage("Lab Catalog")} />}
    {activePage === "Lab Runner" && <LabRunnerPage selectedLab={selectedLab} selectedStatus={selectedStatus} busy={busyAction!==""} logs={getSelectedLabLogs(logs, selectedLab?.id)} onStart={()=>void runAction("start")} onStop={()=>void runAction("stop")} onReset={()=>void runAction("reset")} onImport={()=>void runAction("import")} onRefresh={()=>void Promise.all([loadStatuses(), loadLogs()])} onGoCatalog={()=>setActivePage("Lab Catalog")} />}
    {activePage === "Provider Detection" && <ProviderDetectionPage providers={providers} onDetect={()=>void detectProviders()} />}
    {activePage === "Local Agent Setup" && <LocalAgentSetupPage online={online} agentUrl={settings.agentUrl} token={settings.localToken} resources={resources} />}
    {activePage === "Logs" && <LogsPage logs={filteredLogs} labs={labs} logLevelFilter={logLevelFilter} setLogLevelFilter={setLogLevelFilter} onRefresh={()=>void loadLogs()} />}
    {activePage === "Troubleshooting" && <TroubleshootingPage />}
    {activePage === "Settings" && <SettingsPage draftSettings={draftSettings} setDraftSettings={setDraftSettings} onSave={saveSettings} onReset={resetSettings} />}
  </main></div>;
}
