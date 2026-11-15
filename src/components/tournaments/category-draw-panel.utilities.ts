import { tournamentWorkspace as tws } from "@/components/tournaments/tournament-workspace";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "button_button_primary": tws.primary,
  "stack_md": sharedUtilities.stackMd,
  "section_card_stack_md_category_operation_panel": "section-card category-operation-panel tw:grid tw:w-full tw:min-w-0 tw:gap-3 tw:bg-white",
  "league_groups_panel": "league-groups-panel",
  "page_header": "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2",
  "league_groups_hero": "league-groups-hero",
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "muted": "tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]",
  "section_actions": "section-actions tw:flex tw:flex-wrap tw:items-center tw:gap-2",
  "league_groups_actions": "league-groups-actions",
  "button": tws.primary,
  "section_actions_league_groups_actions": "section-actions league-groups-actions tw:flex tw:flex-wrap tw:gap-2",
  "button_button_secondary": tws.secondary,
  "league_groups_list": "league-groups-list tw:grid tw:min-w-0 tw:grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] tw:gap-3",
  "section_card": tws.panel,
  "league_group_card": "league-group-card tw:min-w-0 tw:gap-2 tw:border tw:border-[var(--line)] tw:bg-white tw:p-0 tw:[&_h4]:m-0",
  "league_group_card_heading": "league-group-card-heading tw:flex tw:items-center tw:gap-2 tw:bg-[#174983] tw:px-3 tw:py-2 tw:text-white tw:[&_h4]:text-xs tw:[&_p]:text-white!",
  "league_group_icon": "league-group-icon tw:inline-flex tw:text-[#205da8] tw:[&_svg]:size-4",
  "simple_list": "simple-list tw:grid tw:min-w-0 tw:gap-0",
  "league_group_pair_list": "league-group-pair-list tw:gap-0",
  "simple_item": tws.row,
  "league_group_pair": "league-group-pair tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-2 tw:bg-transparent tw:px-0 tw:py-3 tw:[&_form]:flex tw:[&_form]:min-w-0 tw:[&_form]:flex-wrap tw:[&_form]:gap-2 tw:[&_select]:min-w-0 tw:[&_select]:max-w-full tw:[&_strong]:text-sm",
  "league_group_pair_icon": "league-group-pair-icon tw:inline-flex tw:shrink-0 tw:text-[#465c75] tw:[&_svg]:size-4",
} as const;
