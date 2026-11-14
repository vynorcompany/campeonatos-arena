import { tournamentWorkspace as tws } from "@/components/tournaments/tournament-workspace";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "button_button_primary": tws.primary,
  "stack_md": sharedUtilities.stackMd,
  "section_card_stack_md_category_operation_panel": "section-card category-operation-panel tw:grid tw:w-full tw:min-w-0 tw:gap-3 tw:bg-white",
  "league_games_panel": "league-games-panel",
  "page_header": "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2",
  "league_games_hero": "league-games-hero",
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "muted": "tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]",
  "category_game_filter_toolbar": "category-game-filter-toolbar tw:grid tw:min-w-0 tw:grid-cols-[minmax(140px,180px)_minmax(140px,180px)_minmax(180px,320px)_auto] tw:justify-start tw:items-end tw:gap-2 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:max-[1000px]:grid-cols-2 tw:max-[560px]:grid-cols-1",
  "league_games_filters": "league-games-filters",
  "category_game_filter_field": tws.field,
  "category_game_filter_field_2": tws.field,
  "button": tws.success,
  "category_game_list": "category-game-list tw:grid tw:min-w-0 tw:gap-0 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white",
  "league_calendar_list": "league-calendar-list tw:gap-3",
  "league_week_divider": "league-week-divider tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-y tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-2 tw:text-xs tw:text-[var(--muted)] tw:[&_strong]:font-medium",
  "category_game_row": "category-game-row tw:grid tw:relative tw:min-w-0 tw:grid-cols-[minmax(90px,.7fr)_minmax(90px,.7fr)_minmax(0,2fr)_minmax(100px,.8fr)_32px] tw:items-center tw:gap-x-3 tw:gap-y-2 tw:border-b tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-2 tw:text-[13px] tw:last:border-b-0 tw:max-[760px]:grid-cols-2 tw:max-[460px]:grid-cols-1",
  "league_calendar_card": "league-calendar-card",
  "category_game_time": "category-game-time tw:grid tw:min-w-0 tw:gap-1 tw:text-[13px] tw:[&_strong]:font-medium tw:[&_strong]:break-words",
  "category_game_label": "category-game-label tw:hidden tw:text-xs tw:font-normal tw:text-[var(--muted)] tw:viewport-760:block",
  "category_game_stage": "category-game-stage tw:grid tw:min-w-0 tw:gap-1 tw:text-[13px] tw:[&_strong]:font-medium",
  "category_game_pairs": "category-game-pairs tw:grid tw:min-w-0 tw:gap-1 tw:text-[13px] tw:break-words",
  "league_match_sides": "league-match-sides tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] tw:items-center tw:gap-2 tw:[&>span]:grid tw:[&>span]:min-w-0 tw:[&_small]:text-xs tw:[&_small]:text-[#465c75] tw:[&_b]:font-normal tw:max-[760px]:grid-cols-1 tw:max-[760px]:gap-1 tw:max-[760px]:[&>b]:text-xs tw:max-[760px]:[&>b]:text-[#465c75]",
  "category_game_result": "category-game-result tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-1 tw:[&>strong]:text-sm tw:[&>strong]:font-semibold tw:[&>span]:text-xs tw:[&>span]:font-medium tw:[&>span]:px-2 tw:[&>span]:py-1 tw:[&>button]:min-h-7 tw:[&>button]:px-2 tw:[&>button]:py-1 tw:[&>button]:text-xs tw:viewport-760:[&>.category-game-label]:basis-full",
  "league_wo_badge": [
    "league-wo-badge", "tw:mt-[4px]", "tw:pt-[2px]", "tw:pr-[6px]",
    "tw:pb-[2px]", "tw:pl-[6px]", "tw:rounded-[5px]", "tw:text-[color:#a12828]",
    "tw:bg-[color:#ffeded]", "tw:[background-image:none]", "tw:font-[800]",
  ].join(" "),
  "category_game_actions": "category-game-actions tw:grid tw:min-w-0 tw:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] tw:items-end tw:gap-3 tw:border-t tw:border-[var(--line)] tw:pt-3",
  "category_game_form": "category-game-form tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2 tw:[&_label]:min-w-0 tw:[&_input]:min-w-0 tw:[&_input]:w-full tw:[&_select]:min-w-0 tw:[&_select]:w-full",
  "category_game_form_2": "category-game-form tw:grid tw:min-w-0 tw:grid-cols-2 tw:items-end tw:gap-2 tw:[&_label]:min-w-0 tw:[&_input]:min-w-0 tw:[&_input]:w-full tw:[&_select]:min-w-0 tw:[&_select]:w-full tw:[&_button]:col-span-full tw:max-[460px]:grid-cols-1",
  "group_standings": "group-standings tw:grid tw:min-w-0 tw:gap-4 tw:[&_h4]:m-0 tw:[&_h4]:text-sm tw:[&_h4]:font-medium",
  "group_standings_table": tws.table,
  "simple_list": "simple-list tw:grid tw:min-w-0 tw:gap-0",
  "simple_item": tws.row,
} as const;
