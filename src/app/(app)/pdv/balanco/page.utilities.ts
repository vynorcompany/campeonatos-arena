import { sharedUtilities } from "@/components/ui/shared.utilities";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
const columns = "tw:grid-cols-[minmax(0,1fr)_100px_120px_150px] tw:viewport-760:grid-cols-[minmax(0,1fr)_100px] tw:viewport-440:grid-cols-1";
export const viewStyles = {
 stack_md_workspace_page_stock_balance_page: ui.page,
 sr_only: sharedUtilities.srOnly,
 page_header: ui.toolbar,
 button: ui.secondary,
 field_stock_balance_reason: ui.field,
 stock_balance_form: "tw:grid tw:min-w-0 tw:gap-4",
 stock_balance_table: ui.list,
 stock_balance_row_stock_balance_head: ui.head + " " + columns,
 stock_balance_row: ui.row + " " + columns + " tw:[&_input]:w-full tw:[&_input]:min-w-0 tw:[&_input]:rounded-[var(--radius-control)] tw:[&_input]:border tw:[&_input]:border-[var(--line)] tw:[&_input]:px-3 tw:[&_input]:py-2 tw:[&_input]:text-sm",
 muted: sharedUtilities.muted,
 stock_balance_actions: "tw:flex tw:justify-end",
 button_button_primary: ui.primary,
 stock_balance_report: ui.list + " tw:[&_article]:flex tw:[&_article]:items-center tw:[&_article]:justify-between tw:[&_article]:gap-3 tw:[&_article]:border-b tw:[&_article]:border-[var(--line)] tw:[&_article]:p-3 tw:[&_article:last-child]:border-0 tw:[&_article>div]:min-w-0 tw:[&_strong]:text-sm tw:[&_span]:block tw:[&_span]:text-xs tw:[&_span]:text-[var(--muted)] tw:[&_small]:block tw:[&_small]:break-words tw:[&_small]:text-xs tw:[&_small]:text-[var(--muted)] tw:[&_.is-loss>b]:text-red-700 tw:[&_.is-surplus>b]:text-emerald-700",
} as const;
