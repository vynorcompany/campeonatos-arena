import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "stats_grid_finance_stats_grid": [
    "stats-grid", "finance-stats-grid", "tw:grid", "tw:gap-y-[18px]",
    "tw:gap-x-[18px]", "tw:grid-cols-[repeat(4,_minmax(0,_1fr))]", "tw:viewport-1120:grid-cols-[1fr]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]",
    "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]", "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]", "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]",
  ].join(" "),
  "stat_card": sharedUtilities.statCard,
  "simple_list": sharedUtilities.simpleList,
  "simple_item": sharedUtilities.simpleItem,
  "muted": sharedUtilities.muted,
} as const;
