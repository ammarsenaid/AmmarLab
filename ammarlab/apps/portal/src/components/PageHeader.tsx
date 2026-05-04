import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return <div className="topbar-in"><div><h3>{title}</h3>{subtitle && <p className="muted">{subtitle}</p>}</div>{right}</div>;
}
