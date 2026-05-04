import type { AgentLogEntry, Lab } from "@ammarlab/shared";
import { toLocaleDateTime, toLocaleTime } from "../utils/formatters";

export function LogList({ logs, shortTime, labs }: { logs: AgentLogEntry[]; shortTime?: boolean; labs?: Lab[] }) {
  return <div>{logs.map((log) => <div className="table-row logs" key={log.id}><span>{shortTime ? toLocaleTime(log.timestampIso) : toLocaleDateTime(log.timestampIso)}</span><span>{log.level}</span><span>{log.action}</span>{labs && <span>{labs.find((l) => l.id === log.labId)?.title ?? "-"}</span>}<span>{log.provider ?? "-"}</span><span>{log.message}</span></div>)}</div>;
}
