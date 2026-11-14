import { tournamentWorkspace as tws } from "@/components/tournaments/tournament-workspace";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": "tw:flex tw:min-w-0 tw:flex-col tw:gap-4",
  "form_error": sharedUtilities.formError,
  "league_score_grid": [
    "league-score-grid", "tw:grid", "tw:grid-cols-[minmax(150px,_1fr)_repeat(3,_minmax(64px,_.42fr))]", "tw:viewport-560:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,.55fr))]",
    "tw:gap-y-[10px]", "tw:viewport-560:gap-y-[7px]", "tw:gap-x-[10px]", "tw:viewport-560:gap-x-[7px]",
    "tw:items-center", "tw:[&_span]:text-[color:var(--muted)]", "tw:[&_span]:text-[.78rem]", "tw:[&_span]:font-[700]",
    "tw:[&_span]:text-center", "tw:[&_span:first-child]:text-left", "tw:[&_input]:w-[100%]", "tw:[&_input]:min-h-[42px]",
    "tw:[&_input]:border", "tw:[&_input]:border-[#718bac]", "tw:[&_input]:bg-white", "tw:[&_input]:text-[#172b45]", "tw:[&_input]:text-center", "tw:[&_input]:min-w-0", "tw:[&_input]:px-1", "tw:[&_strong]:min-w-0", "tw:[&_strong]:break-words",
  ].join(" "),
  "muted": "tw:m-0 tw:text-[13px] tw:leading-relaxed tw:text-[#465c75]",
  "button": tws.secondary,
  "button_button_primary": tws.success,
  "category_league_result_trigger": `${tws.success} tw:min-h-7! tw:px-2! tw:py-1! tw:text-xs!`,
  "eyebrow": sharedUtilities.eyebrow,
} as const;
