import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "button_button_primary": "button button-primary tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#205da8] tw:bg-[#205da8] tw:text-white tw:hover:bg-[#174983]",
  "stack_md": sharedUtilities.stackMd,
  "section_card_stack_md_category_operation_panel": "section-card category-operation-panel tw:grid tw:min-w-0 tw:gap-4 tw:rounded-lg tw:border tw:border-[#b8c9dc] tw:bg-white tw:p-5 tw:text-[#172b45] tw:shadow-none tw:max-[700px]:p-4",
  "league_groups_panel": "league-groups-panel",
  "page_header": "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#d5dfeb] tw:pb-3 tw:[&_h2]:m-0 tw:[&_h2]:text-base tw:[&_h3]:m-0 tw:[&_h3]:text-base tw:[&_h3]:font-medium",
  "league_groups_hero": "league-groups-hero",
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "muted": "tw:m-0 tw:text-[13px] tw:leading-relaxed tw:text-[#465c75]",
  "section_actions": "section-actions tw:flex tw:flex-wrap tw:items-center tw:gap-2",
  "league_groups_actions": "league-groups-actions",
  "button": "button tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#718bac] tw:bg-[#edf3fb] tw:text-[#174983] tw:hover:bg-[#dce9f8]",
  "section_actions_league_groups_actions": "section-actions league-groups-actions tw:flex tw:flex-wrap tw:gap-2",
  "button_button_secondary": "button button-secondary tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#718bac] tw:bg-[#edf3fb] tw:text-[#174983] tw:hover:bg-[#dce9f8]",
  "league_groups_list": "league-groups-list tw:grid tw:min-w-0 tw:grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] tw:gap-4",
  "section_card": "section-card tw:grid tw:min-w-0 tw:gap-4 tw:rounded-lg tw:border tw:border-[#b8c9dc] tw:bg-white tw:p-5 tw:text-[#172b45] tw:shadow-none tw:max-[700px]:p-4",
  "league_group_card": "league-group-card tw:gap-3 tw:rounded-md tw:bg-[#f3f6fa] tw:p-4",
  "league_group_card_heading": "league-group-card-heading tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:[&_h4]:m-0 tw:[&_h4]:text-sm tw:[&_h4]:font-medium",
  "league_group_icon": "league-group-icon tw:inline-flex tw:text-[#205da8] tw:[&_svg]:size-4",
  "simple_list": "simple-list tw:grid tw:min-w-0 tw:gap-0",
  "league_group_pair_list": "league-group-pair-list tw:gap-0",
  "simple_item": "simple-item tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#d5dfeb] tw:px-3 tw:py-3 tw:[&_strong]:font-medium tw:[&_strong]:break-words",
  "league_group_pair": "league-group-pair tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-2 tw:bg-transparent tw:px-0 tw:py-3 tw:[&_form]:flex tw:[&_form]:min-w-0 tw:[&_form]:flex-wrap tw:[&_form]:gap-2 tw:[&_select]:min-w-0 tw:[&_select]:max-w-full tw:[&_strong]:text-sm",
  "league_group_pair_icon": "league-group-pair-icon tw:inline-flex tw:shrink-0 tw:text-[#465c75] tw:[&_svg]:size-4",
} as const;
