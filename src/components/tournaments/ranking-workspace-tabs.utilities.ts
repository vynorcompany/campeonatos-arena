import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export const viewStyles = {
  section_actions_ranking_detail_tabs: "ranking-detail-tabs tw:flex tw:min-w-0 tw:flex-wrap tw:gap-1 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-1 tw:viewport-440:grid tw:viewport-440:grid-cols-2",
  button: ui.secondary + " tw:justify-center",
  button_primary: "tw:border-[#174983]! tw:bg-[#174983]! tw:text-white! tw:hover:bg-[#174983]!",
} as const;
