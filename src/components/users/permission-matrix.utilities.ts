import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "permission_matrix": [
    "permission-matrix", "tw:grid", "tw:gap-y-[14px]", "tw:gap-x-[14px]",
    "tw:pt-[18px]", "tw:viewport-620:pt-[10px]", "tw:pr-[18px]", "tw:viewport-620:pr-[10px]",
    "tw:pb-[18px]", "tw:viewport-620:pb-[10px]", "tw:pl-[18px]", "tw:viewport-620:pl-[10px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]",
    "tw:rounded-[14px]", "tw:bg-[color:rgba(18,_93,_156,_0.04)]", "tw:[background-image:none]", "tw:[&_legend]:pt-[0]",
    "tw:[&_legend]:pr-[6px]", "tw:[&_legend]:pb-[0]", "tw:[&_legend]:pl-[6px]", "tw:[&_legend]:text-[color:var(--text)]",
    "tw:[&_legend]:text-[0.9rem]", "tw:[&_legend]:font-[700]",
  ].join(" "),
  "permission_matrix_heading": [
    "permission-matrix-heading", "tw:flex", "tw:items-center", "tw:viewport-620:items-start",
    "tw:justify-between", "tw:gap-y-[12px]", "tw:gap-x-[12px]", "tw:[&_.button]:[flex:0_0_auto]",
    "tw:viewport-620:flex-col",
  ].join(" "),
  "permission_matrix_help": [
    "permission-matrix-help", "tw:mt-[-5px]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:text-[color:var(--muted)]", "tw:text-[.78rem]",
  ].join(" "),
  "button_button_small": sharedUtilities.buttonButtonSmall,
  "permission_area_grid": [
    "permission-area-grid", "tw:grid", "tw:grid-cols-[repeat(3,_minmax(220px,_1fr))]", "tw:viewport-620:grid-cols-[1fr]",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "permission_area": [
    "permission-area", "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]", "tw:rounded-[9px]",
    "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:[&_h3]:mt-[0]", "tw:[&_h3]:mr-[0]",
    "tw:[&_h3]:mb-[0]", "tw:[&_h3]:ml-[0]", "tw:[&_h3]:pt-[10px]", "tw:[&_h3]:pr-[12px]",
    "tw:[&_h3]:pb-[10px]", "tw:[&_h3]:pl-[12px]", "tw:[&_h3]:border-b-[length:1px]", "tw:[&_h3]:[border-bottom-style:solid]",
    "tw:[&_h3]:border-b-[color:var(--line)]", "tw:[&_h3]:text-[color:var(--brand-strong)]", "tw:[&_h3]:bg-[color:var(--panel-muted)]", "tw:[&_h3]:[background-image:none]",
    "tw:[&_h3]:text-[.8rem]",
  ].join(" "),
  "permission_action": [
    "permission-action", "tw:flex", "tw:items-center", "tw:gap-y-[8px]",
    "tw:gap-x-[8px]", "tw:min-h-[34px]", "tw:pt-[7px]", "tw:pr-[12px]",
    "tw:pb-[7px]", "tw:pl-[12px]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:#e7edf3]", "tw:text-[color:var(--text)]", "tw:text-[.76rem]", "tw:cursor-pointer",
    "tw:[&:last-child]:border-b-[length:0]", "tw:[&:last-child]:[border-bottom-style:none]", "tw:[&:last-child]:border-b-[color:currentColor]", "tw:[&_input]:[inline-size:15px]",
    "tw:[&_input]:[block-size:15px]", "tw:[&_input]:[accent-color:#238448]",
  ].join(" "),
} as const;
