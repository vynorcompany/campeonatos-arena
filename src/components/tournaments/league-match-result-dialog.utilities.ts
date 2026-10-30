import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "form_error": sharedUtilities.formError,
  "league_score_grid": [
    "league-score-grid", "tw:grid", "tw:grid-cols-[minmax(150px,_1fr)_repeat(3,_minmax(64px,_.42fr))]", "tw:viewport-560:grid-cols-[minmax(104px,_1fr)_repeat(3,_minmax(48px,_.55fr))]",
    "tw:gap-y-[10px]", "tw:viewport-560:gap-y-[7px]", "tw:gap-x-[10px]", "tw:viewport-560:gap-x-[7px]",
    "tw:items-center", "tw:[&_span]:text-[color:var(--muted)]", "tw:[&_span]:text-[.78rem]", "tw:[&_span]:font-[700]",
    "tw:[&_span]:text-center", "tw:[&_span:first-child]:text-left", "tw:[&_input]:w-[100%]", "tw:[&_input]:min-h-[42px]",
    "tw:[&_input]:text-center", "tw:[&_input]:min-w-0", "tw:[&_input]:px-1", "tw:[&_strong]:min-w-0", "tw:[&_strong]:break-words",
  ].join(" "),
  "muted": sharedUtilities.muted,
  "button": ui.secondary,
  "button_button_primary": ui.primary,
  "category_league_result_trigger": [
    "category-league-result-trigger", "tw:border-t-[length:0]", "tw:[border-top-style:none]", "tw:border-t-[color:currentColor]",
    "tw:border-r-[length:0]", "tw:[border-right-style:none]", "tw:border-r-[color:currentColor]", "tw:border-b-[length:0]",
    "tw:[border-bottom-style:none]", "tw:border-b-[color:currentColor]", "tw:border-l-[length:0]", "tw:[border-left-style:none]",
    "tw:border-l-[color:currentColor]", "tw:bg-[color:transparent]", "tw:[background-image:none]", "tw:pt-[0]",
    "tw:pr-[0]", "tw:pb-[0]", "tw:pl-[0]", "tw:[font:inherit]",
    "tw:font-[700]", "tw:text-[color:var(--primary)]", "tw:cursor-pointer", "tw:text-left",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
} as const;
