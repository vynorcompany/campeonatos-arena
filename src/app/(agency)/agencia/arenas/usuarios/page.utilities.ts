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
  "data_table": sharedUtilities.dataTable,
  "table_subtext": sharedUtilities.tableSubtext,
  "agency_user_role_form": [
    "agency-user-role-form", "tw:[&_select]:w-[100%]", "tw:[&_select]:pt-[12px]", "tw:[&_select]:pr-[14px]",
    "tw:[&_select]:pb-[12px]", "tw:[&_select]:pl-[14px]", "tw:[&_select]:border-t-[length:1px]", "tw:[&_select]:[border-top-style:solid]",
    "tw:[&_select]:border-t-[color:var(--line)]", "tw:[&_select]:border-r-[length:1px]", "tw:[&_select]:[border-right-style:solid]", "tw:[&_select]:border-r-[color:var(--line)]",
    "tw:[&_select]:border-b-[length:1px]", "tw:[&_select]:[border-bottom-style:solid]", "tw:[&_select]:border-b-[color:var(--line)]", "tw:[&_select]:border-l-[length:1px]",
    "tw:[&_select]:[border-left-style:solid]", "tw:[&_select]:border-l-[color:var(--line)]", "tw:[&_select]:rounded-[var(--radius-md)]", "tw:[&_select]:bg-[color:var(--panel)]",
    "tw:[&_select]:[background-image:none]", "tw:[&_select]:text-[color:var(--text)]", "tw:[display:inline-grid]", "tw:grid-cols-[minmax(150px,_1fr)_auto]",
    "tw:gap-y-[8px]", "tw:gap-x-[8px]", "tw:items-center",
  ].join(" "),
  "button": sharedUtilities.button,
  "pill": sharedUtilities.pill,
} as const;
