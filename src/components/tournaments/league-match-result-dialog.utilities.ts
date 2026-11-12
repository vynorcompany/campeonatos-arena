import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": "tw:flex tw:min-h-full tw:min-w-0 tw:flex-col tw:gap-4",
  "form_error": sharedUtilities.formError,
  "league_score_grid": [
    "league-score-grid", "tw:grid", "tw:grid-cols-[minmax(150px,_1fr)_repeat(3,_minmax(64px,_.42fr))]", "tw:viewport-560:grid-cols-[minmax(104px,_1fr)_repeat(3,_minmax(48px,_.55fr))]",
    "tw:gap-y-[10px]", "tw:viewport-560:gap-y-[7px]", "tw:gap-x-[10px]", "tw:viewport-560:gap-x-[7px]",
    "tw:items-center", "tw:[&_span]:text-[color:var(--muted)]", "tw:[&_span]:text-[.78rem]", "tw:[&_span]:font-[700]",
    "tw:[&_span]:text-center", "tw:[&_span:first-child]:text-left", "tw:[&_input]:w-[100%]", "tw:[&_input]:min-h-[42px]",
    "tw:[&_input]:border", "tw:[&_input]:border-[#718bac]", "tw:[&_input]:bg-white", "tw:[&_input]:text-[#172b45]", "tw:max-[380px]:grid-cols-[minmax(80px,1fr)_repeat(3,minmax(0,.55fr))]", "tw:[&_input]:text-center", "tw:[&_input]:min-w-0", "tw:[&_input]:px-1", "tw:[&_strong]:min-w-0", "tw:[&_strong]:break-words",
  ].join(" "),
  "muted": "tw:m-0 tw:text-[13px] tw:leading-relaxed tw:text-[#465c75]",
  "button": "button tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#718bac] tw:bg-[#edf3fb] tw:text-[#174983] tw:hover:bg-[#dce9f8]",
  "button_button_primary": "button button-primary tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#205da8] tw:bg-[#205da8] tw:text-white tw:hover:bg-[#174983]",
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
