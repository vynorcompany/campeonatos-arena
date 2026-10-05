import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "stats_grid": sharedUtilities.statsGrid,
  "stat_card": sharedUtilities.statCard,
  "simple_list": sharedUtilities.simpleList,
  "simple_item": sharedUtilities.simpleItem,
  "muted": sharedUtilities.muted,
} as const;
