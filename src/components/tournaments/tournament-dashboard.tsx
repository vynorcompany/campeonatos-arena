import { viewStyles } from "./tournament-dashboard.utilities";
export function TournamentDashboard({ children }: { children: React.ReactNode }) {
  return <div className={viewStyles.stack_md_t_dashboard}>{children}</div>;
}

