import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stat_card": sharedUtilities.statCard,
  "eyebrow": sharedUtilities.eyebrow,
  "stat_card_comparison_stat_card_comparison_up": [
    "stat-card-comparison", "stat-card-comparison-up", "tw:block", "tw:mt-[4px]",
    "tw:text-[.68rem]", "tw:font-[800]", "tw:text-[color:#168044]",
  ].join(" "),
  "stat_card_comparison_stat_card_comparison_down": [
    "stat-card-comparison", "stat-card-comparison-down", "tw:block", "tw:mt-[4px]",
    "tw:text-[.68rem]", "tw:font-[800]", "tw:text-[color:#c13e3e]",
  ].join(" "),
} as const;
