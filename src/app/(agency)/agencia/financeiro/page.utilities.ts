import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "page_header": sharedUtilities.pageHeader,
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "agency_stats_grid": sharedUtilities.agencyStatsGrid,
  "stat_card": sharedUtilities.statCard,
  "agency_arena_list": [
    "agency-arena-list", "tw:grid", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "agency_mini_row": [
    "agency-mini-row", "tw:pt-[16px]", "tw:pr-[16px]", "tw:pb-[16px]",
    "tw:pl-[16px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-md)]", "tw:bg-[color:#ffffff]", "tw:[background-image:none]",
    "tw:flex", "tw:items-start", "tw:justify-between", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:[&_strong]:text-[color:var(--text)]", "tw:[&_>_span]:text-[color:var(--muted)]", "tw:[&_>_span]:text-[0.86rem]",
    "tw:[&_>_span]:font-[800]", "tw:[&_>_span]:whitespace-nowrap",
  ].join(" "),
  "table_subtext": sharedUtilities.tableSubtext,
} as const;
