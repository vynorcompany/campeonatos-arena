import { tournamentWorkspace as tws } from "@/components/tournaments/tournament-workspace";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "button_button_primary": tws.primary,
  "stack_md": sharedUtilities.stackMd,
  "section_card_stack_md_category_operation_panel": "section-card category-operation-panel tw:grid tw:w-full tw:min-w-0 tw:gap-3 tw:bg-white",
  "league_registration_panel": "league-registration-panel",
  "page_header": "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2",
  "league_registration_hero": "league-registration-hero",
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "muted": "tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]",
  "league_registration_list_section": "league-registration-list-section tw:grid tw:min-w-0 tw:gap-3 tw:[&_h4]:m-0 tw:[&_h4]:text-sm tw:[&_h4]:font-medium",
  compact_pair_row: "tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-x-3 tw:gap-y-1 tw:border-b tw:border-[#dce4ee] tw:px-3 tw:py-1.5 tw:scroll-mt-4 tw:[&>details]:col-span-full tw:[&_button]:min-h-7! tw:viewport-760:grid-cols-1 tw:viewport-760:[&_button]:min-h-8!",
  compact_pair_names: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-x-2 tw:gap-y-1 tw:text-[13px] tw:text-[#202c3c]",
  "simple_list": "simple-list tw:grid tw:min-w-0 tw:gap-0",
  "league_registration_list": "league-registration-list tw:gap-0",
  "simple_item": tws.row + " tw:py-1.5! tw:gap-y-1!",
  "league_registration_card": "league-registration-card tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-3 tw:border-b tw:border-[var(--line)] tw:px-3 tw:py-2 tw:viewport-760:grid-cols-1 tw:scroll-mt-4",
  "match_copy": [
    "match-copy", "tw:grid", "tw:gap-y-[2px]", "tw:gap-x-[6px]",
    "tw:[&_span]:text-[color:var(--muted)]",
  ].join(" "),
  "league_registration_pair_name": "league-registration-pair-name tw:text-sm tw:[&_strong]:font-medium",
  "button_button_danger": tws.danger,
  "stack_xs_league_registration_replacements": "stack-xs league-registration-replacements tw:grid tw:min-w-0 tw:gap-2 tw:[&_.inline-pair-edit]:grid tw:[&_.inline-pair-edit]:grid-cols-[minmax(0,1fr)_auto] tw:[&_input]:min-w-0 tw:max-[460px]:[&_.inline-pair-edit]:grid-cols-1",
  "inline_pair_edit": "inline-pair-edit tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-end tw:gap-2 tw:viewport-460:grid-cols-1",
  "button_button_small": tws.secondary,
} as const;
