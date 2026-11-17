import { submenuTabs } from "@/components/ui/submenu-tabs";
import { tournamentWorkspace as ui } from "./tournament-workspace";
export const viewStyles = {
  t_tabs: "t-tabs " + submenuTabs.bar,
  t_tab: "t-tab " + submenuTabs.item,
 t_tabs_compact: "tw:viewport-560:flex-wrap tw:viewport-560:gap-1",
 t_tab_compact: "tw:viewport-560:px-1.5! tw:viewport-560:gap-1! tw:viewport-560:text-[11px]! tw:viewport-560:[&_svg]:size-3.5! tw:viewport-560:[&>span:last-child]:text-[10px]",
 t_tab_active: "t-tab-active " + submenuTabs.selected,
} as const;
