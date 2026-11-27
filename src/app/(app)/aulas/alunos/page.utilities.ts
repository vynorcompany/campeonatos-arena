import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": ui.page,
  "panel": `${ui.panel} tw:[&_h2]:text-sm! tw:[&_h2]:tracking-normal! tw:[&_p]:text-xs`,
  "page_header": sharedUtilities.pageHeader,
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "grid_form": "tw:grid tw:min-w-0 tw:gap-3 tw:sm:grid-cols-2",
  "field_form_full": `${ui.field} tw:col-span-full tw:[&>label]:text-xs!`,
  "field": `${ui.field} tw:[&>label]:text-xs!`,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "button_button_primary": ui.primary,
  "data_table": [sharedUtilities.dataTable,
    "tw:viewport-760:overflow-visible! tw:viewport-760:[&_thead]:sr-only",
    "tw:viewport-760:[&_tbody]:grid tw:viewport-760:[&_tbody_tr]:grid tw:viewport-760:[&_tbody_tr]:grid-cols-2 tw:viewport-760:[&_tbody_tr]:gap-3 tw:viewport-760:[&_tbody_tr]:border-b tw:viewport-760:[&_tbody_tr]:border-[var(--line)] tw:viewport-760:[&_tbody_tr]:py-4",
    "tw:viewport-760:[&_tbody_td]:min-w-0 tw:viewport-760:[&_tbody_td]:border-0! tw:viewport-760:[&_tbody_td]:p-0! tw:viewport-760:[&_tbody_td:first-child]:col-span-2 tw:viewport-760:[&_tbody_td:last-child]:col-span-2",
    "tw:viewport-760:[&_.entity-actions-cell]:flex-row tw:viewport-760:[&_.entity-actions-cell]:items-start",
  ].join(" "),
  "mobile_column_label": "tw:hidden tw:viewport-760:mb-1 tw:viewport-760:block tw:viewport-760:text-xs tw:viewport-760:text-[var(--muted)]",
  "inline_form": `${ui.filters} tw:[&_input]:h-9 tw:[&_input]:w-20 tw:[&_input]:rounded-lg tw:[&_input]:text-[13px]`,
  "button": ui.secondary,
} as const;
