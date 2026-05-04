export function CommandBlock({ commands }: { commands: string[] }) { return <div className="commands">{commands.map((c) => <code key={c}>{c}</code>)}</div>; }
