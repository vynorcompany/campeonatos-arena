import { submenuTabs } from "@/components/ui/submenu-tabs";
import { tournamentWorkspace as managementControls } from "@/components/tournaments/tournament-workspace";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
export const viewStyles = {
  section_actions_ranking_detail_tabs: "ranking-detail-tabs " + submenuTabs.bar,
  button: submenuTabs.item,
  button_primary: submenuTabs.selected,
} as const;
