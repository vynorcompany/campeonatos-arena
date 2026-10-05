import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "t_metric_grid": [
    "t-metric-grid", "tw:grid", "tw:grid-cols-[repeat(4,_minmax(0,_1fr))]", "tw:viewport-980:grid-cols-[repeat(2,_minmax(0,_1fr))]",
    "tw:viewport-680:grid-cols-[1fr]", "tw:gap-y-[20px]", "tw:gap-x-[20px]",
  ].join(" "),
  "section_card": sharedUtilities.sectionCard2,
  "muted": sharedUtilities.muted,
  "section_actions": sharedUtilities.sectionActions,
  "button": sharedUtilities.button,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "simple_list": sharedUtilities.simpleList,
  "simple_item": sharedUtilities.simpleItem,
  "group_grid": [
    "group-grid", "tw:grid", "tw:gap-y-[18px]", "tw:gap-x-[18px]",
    "tw:grid-cols-[repeat(2,_minmax(0,_1fr))]", "tw:viewport-1120:grid-cols-[1fr]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]", "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]",
    "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]", "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]",
  ].join(" "),
  "group_list": [
    "group-list", "tw:grid", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "group_item": [
    "group-item", "tw:flex", "tw:viewport-760:grid", "tw:items-center",
    "tw:justify-between", "tw:gap-y-[14px]", "tw:gap-x-[14px]", "tw:pt-[16px]",
    "tw:pr-[16px]", "tw:pb-[16px]", "tw:pl-[16px]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-md)]",
    "tw:bg-[color:var(--panel-muted)]", "tw:[background-image:none]", "tw:[transition:transform_200ms_var(--ease-standard),_border-color_200ms_var(--ease-standard),_box-shadow_200ms_var(--ease-standard),_background_200ms_var(--ease-standard)]", "tw:hover:[transform:translateY(-2px)]",
    "tw:hover:border-t-[color:var(--line-strong)]", "tw:hover:border-r-[color:var(--line-strong)]", "tw:hover:border-b-[color:var(--line-strong)]", "tw:hover:border-l-[color:var(--line-strong)]",
    "tw:hover:[box-shadow:0_12px_22px_rgba(31,_61,_95,_0.06)]", "tw:hover:bg-[color:#ffffff]", "tw:hover:[background-image:none]",
  ].join(" "),
  "t_board_grid": [
    "t-board-grid", "tw:grid", "tw:grid-cols-[repeat(3,_minmax(0,_1fr))]", "tw:viewport-980:grid-cols-[repeat(2,_minmax(0,_1fr))]",
    "tw:viewport-680:grid-cols-[1fr]", "tw:gap-y-[16px]", "tw:gap-x-[16px]",
  ].join(" "),
} as const;
