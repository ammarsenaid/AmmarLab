export const minutesToDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export const toLocaleDateTime = (iso: string) => new Date(iso).toLocaleString();
export const toLocaleTime = (iso: string) => new Date(iso).toLocaleTimeString();
