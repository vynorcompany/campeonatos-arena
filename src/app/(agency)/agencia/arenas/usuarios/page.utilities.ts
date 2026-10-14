import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "page_header": sharedUtilities.pageHeader,
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "data_table": [
    sharedUtilities.dataTable,
    "tw:viewport-720:w-full", "tw:viewport-720:min-w-0!",
    "tw:viewport-720:[overflow-x:visible]", "tw:viewport-720:[&_thead]:hidden",
    "tw:viewport-720:[&_tbody]:grid", "tw:viewport-720:[&_tbody]:gap-3",
    "tw:viewport-720:[&_tbody_tr]:grid", "tw:viewport-720:[&_tbody_tr]:min-w-0", "tw:viewport-720:[&_tbody_tr]:gap-3",
    "tw:viewport-720:[&_tbody_tr]:rounded-[var(--radius-md)]",
    "tw:viewport-720:[&_tbody_tr]:border", "tw:viewport-720:[&_tbody_tr]:border-[color:var(--line)]",
    "tw:viewport-720:[&_tbody_tr]:p-3", "tw:viewport-720:[&_tbody_td]:block",
    "tw:viewport-720:[&_tbody_td]:p-0", "tw:viewport-720:[&_tbody_td]:min-w-0",
    "tw:viewport-720:[&_tbody_td]:[overflow-wrap:anywhere]",
    "tw:viewport-720:[&_tbody_tr_+_tr_td]:border-0",
  ].join(" "),
  "mobile_label": [
    "tw:hidden", "tw:viewport-720:block", "tw:mb-1", "tw:text-[0.72rem]",
    "tw:font-[700]", "tw:uppercase", "tw:tracking-[0.08em]", "tw:text-[color:var(--muted)]",
  ].join(" "),
  "table_subtext": sharedUtilities.tableSubtext,
  "agency_user_role_form": [
    "agency-user-role-form", "tw:[&_select]:w-[100%]", "tw:[&_select]:pt-[12px]", "tw:[&_select]:pr-[14px]",
    "tw:[&_select]:pb-[12px]", "tw:[&_select]:pl-[14px]", "tw:[&_select]:border-t-[length:1px]", "tw:[&_select]:[border-top-style:solid]",
    "tw:[&_select]:border-t-[color:var(--line)]", "tw:[&_select]:border-r-[length:1px]", "tw:[&_select]:[border-right-style:solid]", "tw:[&_select]:border-r-[color:var(--line)]",
    "tw:[&_select]:border-b-[length:1px]", "tw:[&_select]:[border-bottom-style:solid]", "tw:[&_select]:border-b-[color:var(--line)]", "tw:[&_select]:border-l-[length:1px]",
    "tw:[&_select]:[border-left-style:solid]", "tw:[&_select]:border-l-[color:var(--line)]", "tw:[&_select]:rounded-[var(--radius-md)]", "tw:[&_select]:bg-[color:var(--panel)]",
    "tw:[&_select]:[background-image:none]", "tw:[&_select]:text-[color:var(--text)]", "tw:[display:inline-grid]", "tw:grid-cols-[minmax(150px,_1fr)_auto]",
    "tw:gap-y-[8px]", "tw:gap-x-[8px]", "tw:items-center",
    "tw:viewport-720:grid-cols-[minmax(0,1fr)]", "tw:viewport-720:[&_button]:justify-self-start",
  ].join(" "),
  "button": sharedUtilities.button,
  "pill": [sharedUtilities.pill, "tw:viewport-720:max-w-full", "tw:viewport-720:[overflow-wrap:anywhere]"].join(" "),
} as const;
