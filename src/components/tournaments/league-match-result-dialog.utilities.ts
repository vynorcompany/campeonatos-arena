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
    "tw:[&_input]:text-center",
  ].join(" "),
  "muted": sharedUtilities.muted,
  "button": sharedUtilities.button,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "category_league_result_trigger": [
    "category-league-result-trigger", "tw:border-t-[length:0]", "tw:[border-top-style:none]", "tw:border-t-[color:currentColor]",
    "tw:border-r-[length:0]", "tw:[border-right-style:none]", "tw:border-r-[color:currentColor]", "tw:border-b-[length:0]",
    "tw:[border-bottom-style:none]", "tw:border-b-[color:currentColor]", "tw:border-l-[length:0]", "tw:[border-left-style:none]",
    "tw:border-l-[color:currentColor]", "tw:bg-[color:transparent]", "tw:[background-image:none]", "tw:pt-[0]",
    "tw:pr-[0]", "tw:pb-[0]", "tw:pl-[0]", "tw:[font:inherit]",
    "tw:font-[700]", "tw:text-[color:var(--primary)]", "tw:cursor-pointer", "tw:text-left",
  ].join(" "),
  "league_score_backdrop": [
    "league-score-backdrop", "tw:fixed", "tw:top-[0]", "tw:right-[0]",
    "tw:bottom-[0]", "tw:left-[0]", "tw:z-[50]", "tw:grid",
    "tw:place-items-center", "tw:pt-[20px]", "tw:pr-[20px]", "tw:pb-[20px]",
    "tw:pl-[20px]", "tw:bg-[color:rgb(15_23_42_/_.52)]", "tw:[background-image:none]",
  ].join(" "),
  "league_score_dialog": [
    "league-score-dialog", "tw:w-[min(100%,_640px)]", "tw:grid", "tw:gap-y-[20px]",
    "tw:gap-x-[20px]", "tw:pt-[24px]", "tw:viewport-560:pt-[18px]", "tw:pr-[24px]",
    "tw:viewport-560:pr-[18px]", "tw:pb-[24px]", "tw:viewport-560:pb-[18px]", "tw:pl-[24px]",
    "tw:viewport-560:pl-[18px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[18px]", "tw:bg-[color:var(--panel)]", "tw:[background-image:none]",
    "tw:[box-shadow:0_24px_60px_rgb(15_23_42_/_.28)]", "tw:[&_header]:flex", "tw:[&_header]:justify-between", "tw:[&_header]:gap-y-[16px]",
    "tw:[&_header]:gap-x-[16px]", "tw:[&_header]:items-start", "tw:[&_h3]:mt-[0]", "tw:[&_h3]:mr-[0]",
    "tw:[&_h3]:mb-[0]", "tw:[&_h3]:ml-[0]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
} as const;
