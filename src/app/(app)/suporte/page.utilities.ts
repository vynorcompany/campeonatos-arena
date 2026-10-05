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
  "grid_form": sharedUtilities.gridForm,
  "field": sharedUtilities.field,
  "field_form_full": sharedUtilities.fieldFormFull,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "support_ticket_list": [
    "support-ticket-list", "tw:grid", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "support_ticket_card": [
    "support-ticket-card", "tw:pt-[16px]", "tw:pr-[16px]", "tw:pb-[16px]",
    "tw:pl-[16px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-md)]", "tw:bg-[color:var(--panel-muted)]", "tw:[background-image:none]",
    "tw:grid", "tw:grid-cols-[minmax(0,_1fr)_minmax(220px,_0.34fr)]", "tw:viewport-1024:grid-cols-[1fr]", "tw:gap-y-[18px]",
    "tw:gap-x-[18px]", "tw:[&_h3]:mt-[8px]", "tw:[&_h3]:mr-[0]", "tw:[&_h3]:mb-[4px]",
    "tw:[&_h3]:ml-[0]", "tw:[&_h3]:text-[color:var(--text)]", "tw:[&_h3]:text-[1.05rem]",
  ].join(" "),
  "ticket_status": sharedUtilities.ticketStatus,
  "table_subtext": sharedUtilities.tableSubtext,
  "support_ticket_meta": [
    "support-ticket-meta", "tw:grid", "tw:[align-content:start]", "tw:gap-y-[8px]",
    "tw:gap-x-[8px]", "tw:text-[color:var(--muted)]", "tw:text-[0.88rem]", "tw:font-[700]",
  ].join(" "),
} as const;
