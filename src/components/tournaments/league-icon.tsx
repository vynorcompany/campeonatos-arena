import type { ReactNode, SVGProps } from "react";

export type LeagueIconName = "grid" | "users" | "groups" | "ball" | "trophy" | "history" | "calendar" | "ranking" | "edit" | "save" | "refresh";

const paths: Record<LeagueIconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.4A4.6 4.6 0 0 1 8.1 14h1.8a4.6 4.6 0 0 1 4.6 4.6V20" /><path d="M16 5.4a3 3 0 0 1 0 5.2M18.5 20v-1.4a4.6 4.6 0 0 0-2.7-4.2" /></>,
  groups: <><circle cx="8" cy="8" r="2.7" /><circle cx="17" cy="8" r="2.7" /><path d="M2.8 19.5v-1.1A4.4 4.4 0 0 1 7.2 14h1.6a4.4 4.4 0 0 1 4.4 4.4v1.1M12.3 19.5v-1.1A4.4 4.4 0 0 1 16.7 14h.1a4.4 4.4 0 0 1 4.4 4.4v1.1" /></>,
  ball: <><circle cx="12" cy="12" r="8.7" /><path d="M5.8 5.8c3.1 1 4.9 3.1 5.3 6.2.4 3.1 2.2 5.2 5.3 6.2M18.2 5.8c-3.1 1-4.9 3.1-5.3 6.2-.4 3.1-2.2 5.2-5.3 6.2" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4M12 13v4M8.5 20h7" /></>,
  history: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" /><path d="M4 4v4.5h4.5M12 7v5l3.3 2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17" /></>,
  ranking: <><path d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7" /></>,
  edit: <><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z" /><path d="m13.8 6.7 3.5 3.5" /></>,
  save: <><path d="M5 3h12l3 3v15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M7 3v6h9V3M8 21v-7h8v7" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0 1 4" /><path d="M20 4v7h-7" /></>,
};

export function LeagueIcon({ name, ...props }: { name: LeagueIconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} className={`league-icon ${props.className ?? ""}`.trim()}>{paths[name]}</svg>;
}
