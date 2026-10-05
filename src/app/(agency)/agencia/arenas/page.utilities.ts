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
  "agency_arena_management_list": [
    "agency-arena-management-list", "tw:grid", "tw:gap-y-[16px]", "tw:gap-x-[16px]",
  ].join(" "),
  "agency_arena_card": [
    "agency-arena-card", "tw:grid", "tw:gap-y-[16px]", "tw:gap-x-[16px]",
    "tw:pt-[18px]", "tw:pr-[18px]", "tw:pb-[18px]", "tw:pl-[18px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]",
    "tw:rounded-[var(--radius-lg)]", "tw:bg-[color:#ffffff]", "tw:[background-image:none]",
  ].join(" "),
  "agency_ticket_head": [
    "agency-ticket-head", "tw:flex", "tw:items-start", "tw:justify-between",
    "tw:gap-y-[14px]", "tw:gap-x-[14px]",
  ].join(" "),
  "ticket_status": sharedUtilities.ticketStatus,
  "agency_status_form": [
    "agency-status-form", "tw:inline-flex", "tw:items-center", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]", "tw:flex-wrap", "tw:[&_select]:w-[100%]", "tw:[&_select]:pt-[12px]",
    "tw:[&_select]:pr-[14px]", "tw:[&_select]:pb-[12px]", "tw:[&_select]:pl-[14px]", "tw:[&_select]:border-t-[length:1px]",
    "tw:[&_select]:[border-top-style:solid]", "tw:[&_select]:border-t-[color:var(--line)]", "tw:[&_select]:border-r-[length:1px]", "tw:[&_select]:[border-right-style:solid]",
    "tw:[&_select]:border-r-[color:var(--line)]", "tw:[&_select]:border-b-[length:1px]", "tw:[&_select]:[border-bottom-style:solid]", "tw:[&_select]:border-b-[color:var(--line)]",
    "tw:[&_select]:border-l-[length:1px]", "tw:[&_select]:[border-left-style:solid]", "tw:[&_select]:border-l-[color:var(--line)]", "tw:[&_select]:rounded-[var(--radius-md)]",
    "tw:[&_select]:bg-[color:var(--panel)]", "tw:[&_select]:[background-image:none]", "tw:[&_select]:text-[color:var(--text)]",
  ].join(" "),
  "button": sharedUtilities.button,
  "agency_arena_edit_form": [
    "agency-arena-edit-form", "tw:[&_input]:w-[100%]", "tw:[&_input]:pt-[12px]", "tw:[&_input]:pr-[14px]",
    "tw:[&_input]:pb-[12px]", "tw:[&_input]:pl-[14px]", "tw:[&_input]:border-t-[length:1px]", "tw:[&_input]:[border-top-style:solid]",
    "tw:[&_input]:border-t-[color:var(--line)]", "tw:[&_input]:border-r-[length:1px]", "tw:[&_input]:[border-right-style:solid]", "tw:[&_input]:border-r-[color:var(--line)]",
    "tw:[&_input]:border-b-[length:1px]", "tw:[&_input]:[border-bottom-style:solid]", "tw:[&_input]:border-b-[color:var(--line)]", "tw:[&_input]:border-l-[length:1px]",
    "tw:[&_input]:[border-left-style:solid]", "tw:[&_input]:border-l-[color:var(--line)]", "tw:[&_input]:rounded-[var(--radius-md)]", "tw:[&_input]:bg-[color:var(--panel)]",
    "tw:[&_input]:[background-image:none]", "tw:[&_input]:text-[color:var(--text)]", "tw:[&_textarea]:w-[100%]", "tw:[&_textarea]:pt-[12px]",
    "tw:[&_textarea]:pr-[14px]", "tw:[&_textarea]:pb-[12px]", "tw:[&_textarea]:pl-[14px]", "tw:[&_textarea]:border-t-[length:1px]",
    "tw:[&_textarea]:[border-top-style:solid]", "tw:[&_textarea]:border-t-[color:var(--line)]", "tw:[&_textarea]:border-r-[length:1px]", "tw:[&_textarea]:[border-right-style:solid]",
    "tw:[&_textarea]:border-r-[color:var(--line)]", "tw:[&_textarea]:border-b-[length:1px]", "tw:[&_textarea]:[border-bottom-style:solid]", "tw:[&_textarea]:border-b-[color:var(--line)]",
    "tw:[&_textarea]:border-l-[length:1px]", "tw:[&_textarea]:[border-left-style:solid]", "tw:[&_textarea]:border-l-[color:var(--line)]", "tw:[&_textarea]:rounded-[var(--radius-md)]",
    "tw:[&_textarea]:bg-[color:var(--panel)]", "tw:[&_textarea]:[background-image:none]", "tw:[&_textarea]:text-[color:var(--text)]", "tw:[&_textarea]:[grid-column:1_/_-1]",
    "tw:[&_textarea]:min-h-[88px]", "tw:[&_textarea]:[resize:vertical]", "tw:grid", "tw:grid-cols-[repeat(4,_minmax(0,_1fr))]",
    "tw:viewport-1024:grid-cols-[1fr]", "tw:gap-y-[10px]", "tw:gap-x-[10px]", "tw:[align-items:start]",
    "tw:[&_.button]:[justify-self:start]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "agency_danger_form": [
    "agency-danger-form", "tw:inline-flex", "tw:items-center", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]", "tw:flex-wrap",
  ].join(" "),
  "button_button_secondary": sharedUtilities.buttonButtonSecondary,
} as const;
