import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "button_button_primary": "button button-primary tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#205da8] tw:bg-[#205da8] tw:text-white tw:hover:bg-[#174983]",
  "stack_md": sharedUtilities.stackMd,
  "section_card_stack_md_category_operation_panel": "section-card category-operation-panel tw:grid tw:min-w-0 tw:gap-4 tw:rounded-lg tw:border tw:border-[#b8c9dc] tw:bg-white tw:p-5 tw:text-[#172b45] tw:shadow-none tw:max-[700px]:p-4",
  "league_registration_panel": "league-registration-panel",
  "page_header": "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#d5dfeb] tw:pb-3 tw:[&_h2]:m-0 tw:[&_h2]:text-base tw:[&_h3]:m-0 tw:[&_h3]:text-base tw:[&_h3]:font-medium",
  "league_registration_hero": "league-registration-hero",
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "muted": "tw:m-0 tw:text-[13px] tw:leading-relaxed tw:text-[#465c75]",
  "league_registration_list_section": "league-registration-list-section tw:grid tw:min-w-0 tw:gap-3 tw:[&_h4]:m-0 tw:[&_h4]:text-sm tw:[&_h4]:font-medium",
  "simple_list": "simple-list tw:grid tw:min-w-0 tw:gap-0",
  "league_registration_list": "league-registration-list tw:gap-0",
  "simple_item": "simple-item tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#d5dfeb] tw:px-3 tw:py-3 tw:[&_strong]:font-medium tw:[&_strong]:break-words",
  "league_registration_card": "league-registration-card tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-start tw:rounded-none tw:bg-white tw:max-[850px]:grid-cols-1",
  "match_copy": [
    "match-copy", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
    "tw:[&_span]:text-[color:var(--muted)]",
  ].join(" "),
  "league_registration_pair_name": "league-registration-pair-name tw:text-sm tw:[&_strong]:font-medium",
  "button_button_danger": "button button-danger tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#b52a23] tw:bg-[#b52a23] tw:text-white tw:hover:bg-[#92221c]",
  "stack_xs_league_registration_replacements": "stack-xs league-registration-replacements tw:grid tw:min-w-0 tw:gap-2 tw:[&_.inline-pair-edit]:grid tw:[&_.inline-pair-edit]:grid-cols-[minmax(0,1fr)_auto] tw:[&_input]:min-w-0 tw:max-[460px]:[&_.inline-pair-edit]:grid-cols-1",
  "inline_pair_edit": "inline-pair-edit tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2",
  "button_button_small": "button button-small tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#718bac] tw:bg-[#edf3fb] tw:text-[#174983] tw:hover:bg-[#dce9f8]",
} as const;
