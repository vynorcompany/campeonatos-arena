import { tournamentWorkspace as ui } from "./tournament-workspace";
export const viewStyles = {
 t_tabs: "t-tabs tw:flex tw:w-full tw:min-w-0 tw:gap-2 tw:overflow-x-auto tw:pb-1",
 t_tab: "t-tab " + ui.secondary + " tw:shrink-0 tw:whitespace-nowrap",
 t_tabs_compact: "tw:viewport-560:flex-wrap tw:viewport-560:gap-1",
 t_tab_compact: "tw:viewport-560:px-1.5! tw:viewport-560:gap-1! tw:viewport-560:text-[11px]! tw:viewport-560:[&_svg]:size-3.5! tw:viewport-560:[&>span:last-child]:text-[10px]",
 t_tab_active: "t-tab-active tw:border-[#103b6c]! tw:bg-[#103b6c]! tw:text-white! tw:font-semibold! tw:underline tw:decoration-2 tw:underline-offset-4 tw:hover:bg-[#0a2955]!"
} as const;
