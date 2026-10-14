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
    "tw:viewport-720:w-full", "tw:viewport-720:min-w-0!", "tw:viewport-720:[overflow-x:visible]",
    "tw:viewport-720:[&_thead]:hidden", "tw:viewport-720:[&_tbody]:grid", "tw:viewport-720:[&_tbody]:gap-3",
    "tw:viewport-720:[&_tbody_tr]:grid", "tw:viewport-720:[&_tbody_tr]:min-w-0", "tw:viewport-720:[&_tbody_tr]:gap-3",
    "tw:viewport-720:[&_tbody_tr]:rounded-[var(--radius-md)]", "tw:viewport-720:[&_tbody_tr]:border",
    "tw:viewport-720:[&_tbody_tr]:border-[color:var(--line)]", "tw:viewport-720:[&_tbody_tr]:p-3",
    "tw:viewport-720:[&_tbody_td]:block", "tw:viewport-720:[&_tbody_td]:min-w-0",
    "tw:viewport-720:[&_tbody_td]:p-0", "tw:viewport-720:[&_tbody_td]:[overflow-wrap:anywhere]",
    "tw:viewport-720:[&_tbody_tr_+_tr_td]:border-0",
  ].join(" "),
  "mobile_label": [
    "tw:hidden", "tw:viewport-720:block", "tw:mb-1", "tw:text-[0.72rem]",
    "tw:font-[700]", "tw:uppercase", "tw:tracking-[0.08em]", "tw:text-[color:var(--muted)]",
  ].join(" "),
  "ticket_status": sharedUtilities.ticketStatus,
  "table_subtext": sharedUtilities.tableSubtext,
} as const;
