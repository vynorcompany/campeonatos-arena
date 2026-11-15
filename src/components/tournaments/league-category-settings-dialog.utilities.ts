import { tournamentWorkspace as tws } from "@/components/tournaments/tournament-workspace";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "button_button_small_league_category_edit_trigger": tws.secondary,
  "league_settings_dialog": "league-settings-dialog tw:flex tw:min-w-0 tw:flex-col tw:gap-4 tw:[&_footer]:mt-auto tw:[&_footer]:flex tw:[&_footer]:flex-wrap tw:[&_footer]:justify-end tw:[&_footer]:gap-2 tw:[&_footer]:border-t tw:[&_footer]:border-[var(--line)] tw:[&_footer]:pt-3",
  "eyebrow": sharedUtilities.eyebrow,
  "button_button_small": "button tw:inline-flex tw:min-h-9 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[5px] tw:border tw:px-3 tw:py-2 tw:text-[13px] tw:font-normal tw:leading-tight tw:no-underline tw:cursor-pointer tw:disabled:cursor-default tw:disabled:opacity-60 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:[&_svg]:size-4 tw:border-[#718bac] tw:bg-[#ffffff] tw:text-[#174983] tw:hover:bg-[#ffffff]",
  "field": tws.field,
  "league_settings_grid": [
    "league-settings-grid", "tw:grid", "tw:grid-cols-[repeat(2,minmax(0,1fr))]", "tw:viewport-760:grid-cols-[1fr]",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "button": tws.secondary,
  "button_button_primary": tws.success,
} as const;
