import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "button_button_small_league_category_edit_trigger": [
    "button", "button-small", "league-category-edit-trigger", "tw:inline-flex",
    "tw:items-center", "tw:justify-center", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
    "tw:min-h-[30px]", "tw:pt-[5px]", "tw:pr-[8px]", "tw:pb-[5px]",
    "tw:pl-[8px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-control)]", "tw:bg-[color:var(--panel)]", "tw:[background-image:none]",
    "tw:text-[color:var(--text)]", "tw:text-[.72rem]", "tw:[transition:transform_180ms_var(--ease-standard),_border-color_180ms_var(--ease-standard),_background_180ms_var(--ease-standard),_box-shadow_180ms_var(--ease-standard),_color_180ms_var(--ease-standard)]", "tw:hover:border-t-[color:var(--line-strong)]",
    "tw:hover:border-r-[color:var(--line-strong)]", "tw:hover:border-b-[color:var(--line-strong)]", "tw:hover:border-l-[color:var(--line-strong)]", "tw:hover:[transform:translateY(-1px)]",
    "tw:hover:[box-shadow:0_10px_20px_rgba(28,_54,_89,_0.08)]", "tw:disabled:opacity-[0.72]", "tw:disabled:cursor-wait", "tw:[&:active]:[transform:translateY(0)]",
    "tw:[&:active]:[box-shadow:none]", "tw:ml-[4px]",
  ].join(" "),
  "league_settings_dialog": "league-settings-dialog tw:grid tw:min-w-0 tw:gap-4 tw:[&_footer]:flex tw:[&_footer]:flex-wrap tw:[&_footer]:justify-end tw:[&_footer]:gap-2 tw:[&_footer]:border-t tw:[&_footer]:border-[var(--line)] tw:[&_footer]:pt-3",
  "eyebrow": sharedUtilities.eyebrow,
  "button_button_small": ui.secondary,
  "field": `${ui.field} tw:[&_:where(input,select)]:rounded-[7px]!`,
  "league_settings_grid": [
    "league-settings-grid", "tw:grid", "tw:grid-cols-[repeat(2,minmax(0,1fr))]", "tw:viewport-760:grid-cols-[1fr]",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "button": ui.secondary,
  "button_button_primary": ui.primary,
} as const;
