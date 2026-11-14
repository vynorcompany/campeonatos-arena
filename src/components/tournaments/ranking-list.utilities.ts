import { tournamentWorkspace as managementControls } from "@/components/tournaments/tournament-workspace";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
export const viewStyles = {
  muted: sharedUtilities.muted,
  active_event_list: "active-event-list ranking-active-list " + ui.list,
  active_event_row: "active-event-row ranking-active-row " + ui.row + " tw:grid-cols-[minmax(0,1fr)_auto] tw:[&_span]:block tw:[&_span]:text-xs tw:[&_span]:text-[var(--muted)] tw:[&_small]:mt-0.5",
  button: (ui.secondary) + " " + managementControls.secondary,
} as const;
