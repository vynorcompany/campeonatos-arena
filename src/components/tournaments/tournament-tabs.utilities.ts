import { tournamentWorkspace as ui } from "./tournament-workspace";
export const viewStyles = {
 t_tabs: "t-tabs tw:flex tw:w-full tw:min-w-0 tw:gap-2 tw:overflow-x-auto tw:pb-1",
 t_tab: "t-tab " + ui.secondary + " tw:shrink-0 tw:whitespace-nowrap",
 t_tab_active: "t-tab-active tw:border-[#215da5]! tw:bg-[#215da5]! tw:text-white!"
} as const;
