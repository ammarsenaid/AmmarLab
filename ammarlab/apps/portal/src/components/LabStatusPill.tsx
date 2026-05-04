export function LabStatusPill({ state }: { state: string }) { return <span className={`badge status-${state}`}>{state}</span>; }
