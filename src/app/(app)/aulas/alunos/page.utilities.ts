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
  "data_table": sharedUtilities.dataTable,
  "inline_form": `${ui.filters} tw:[&_input]:h-9 tw:[&_input]:w-20 tw:[&_input]:rounded-lg tw:[&_input]:text-[13px]`,
  "button": ui.secondary,
} as const;
