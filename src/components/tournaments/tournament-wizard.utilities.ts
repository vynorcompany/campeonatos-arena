import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "t_wizard": [
    "t-wizard", "tw:grid", "tw:gap-y-[24px]", "tw:gap-x-[24px]",
  ].join(" "),
  "t_progress_meta": [
    "t-progress-meta", "tw:flex", "tw:justify-between", "tw:text-[color:var(--muted)]",
  ].join(" "),
  "t_progress_bar": [
    "t-progress-bar", "tw:h-[10px]", "tw:rounded-[999px]", "tw:bg-[color:#eef3f9]",
    "tw:[background-image:none]", "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]", "tw:[&_span]:block",
    "tw:[&_span]:h-[100%]", "tw:[&_span]:bg-[color:transparent]", "tw:[&_span]:[background-image:linear-gradient(90deg,_#1e5ea8,_#2f7fd4)]",
  ].join(" "),
  "field": sharedUtilities.field,
  "tournament_radar_toggle": [
    "tournament-radar-toggle", "tw:flex", "tw:items-center", "tw:gap-y-[9px]",
    "tw:gap-x-[9px]", "tw:pt-[10px]", "tw:pr-[11px]", "tw:pb-[10px]",
    "tw:pl-[11px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#cce4db]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#cce4db]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#cce4db]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#cce4db]", "tw:rounded-[9px]", "tw:text-[color:#1d6653]", "tw:bg-[color:#f2fbf7]",
    "tw:[background-image:none]", "tw:cursor-pointer", "tw:[&_input]:w-[16px]", "tw:[&_input]:h-[16px]",
    "tw:[&_input]:[accent-color:#087b63]", "tw:[&_>_span]:grid", "tw:[&_>_span]:gap-y-[2px]", "tw:[&_>_span]:gap-x-[2px]",
    "tw:[&_small]:text-[color:#5b7b70]", "tw:[&_small]:text-[.7rem]", "tw:[&_small]:font-[500]",
  ].join(" "),
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "category_option": [
    "category-option", "tw:flex", "tw:items-center", "tw:justify-start",
    "tw:gap-y-[8px]", "tw:gap-x-[8px]", "tw:[&_input]:mt-[0]", "tw:[&_input]:mr-[0]",
    "tw:[&_input]:mb-[0]", "tw:[&_input]:ml-[0]", "tw:[&_input]:w-[18px]", "tw:[&_input]:h-[18px]",
    "tw:[&_input]:[flex:0_0_auto]",
  ].join(" "),
  "button": sharedUtilities.button,
  "t_review_grid": [
    "t-review-grid", "tw:grid", "tw:grid-cols-[repeat(2,_minmax(0,_1fr))]", "tw:viewport-680:grid-cols-[1fr]",
    "tw:gap-y-[16px]", "tw:gap-x-[16px]", "tw:[&_article]:border-t-[length:1px]", "tw:[&_article]:[border-top-style:solid]",
    "tw:[&_article]:border-t-[color:var(--line)]", "tw:[&_article]:border-r-[length:1px]", "tw:[&_article]:[border-right-style:solid]", "tw:[&_article]:border-r-[color:var(--line)]",
    "tw:[&_article]:border-b-[length:1px]", "tw:[&_article]:[border-bottom-style:solid]", "tw:[&_article]:border-b-[color:var(--line)]", "tw:[&_article]:border-l-[length:1px]",
    "tw:[&_article]:[border-left-style:solid]", "tw:[&_article]:border-l-[color:var(--line)]", "tw:[&_article]:rounded-[14px]", "tw:[&_article]:pt-[16px]",
    "tw:[&_article]:pr-[16px]", "tw:[&_article]:pb-[16px]", "tw:[&_article]:pl-[16px]", "tw:[&_article]:bg-[color:var(--panel-muted)]",
    "tw:[&_article]:[background-image:none]",
  ].join(" "),
  "section_actions": sharedUtilities.sectionActions,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error": sharedUtilities.formError,
  "form_success": sharedUtilities.formSuccess,
} as const;
