import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "two_column_grid": sharedUtilities.twoColumnGrid,
  "grid_form_finance_narrow_form": [
    "grid-form", "finance-narrow-form", "tw:grid", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:grid-cols-[repeat(2,_minmax(0,_1fr))]", "tw:viewport-1120:grid-cols-[1fr]", "tw:[&_textarea]:w-[100%]",
    "tw:[&_textarea]:pt-[12px]", "tw:[&_textarea]:pr-[14px]", "tw:[&_textarea]:pb-[12px]", "tw:[&_textarea]:pl-[14px]",
    "tw:[&_textarea]:border-t-[length:1px]", "tw:[&_textarea]:[border-top-style:solid]", "tw:[&_textarea]:border-t-[color:var(--line)]", "tw:[&_textarea]:border-r-[length:1px]",
    "tw:[&_textarea]:[border-right-style:solid]", "tw:[&_textarea]:border-r-[color:var(--line)]", "tw:[&_textarea]:border-b-[length:1px]", "tw:[&_textarea]:[border-bottom-style:solid]",
    "tw:[&_textarea]:border-b-[color:var(--line)]", "tw:[&_textarea]:border-l-[length:1px]", "tw:[&_textarea]:[border-left-style:solid]", "tw:[&_textarea]:border-l-[color:var(--line)]",
    "tw:[&_textarea]:rounded-[var(--radius-md)]", "tw:[&_textarea]:bg-[color:var(--panel)]", "tw:[&_textarea]:[background-image:none]", "tw:[&_textarea]:text-[color:var(--text)]",
    "tw:[align-content:start]",
  ].join(" "),
  "field": sharedUtilities.field,
  "field_form_full": sharedUtilities.fieldFormFull,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "simple_list_settings_compact_list": [
    "simple-list", "settings-compact-list", "tw:grid", "tw:gap-y-[7px]",
    "tw:gap-x-[7px]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]", "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]", "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]",
    "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]", "tw:[&_.simple-item]:min-h-[0]", "tw:[&_.simple-item]:pt-[10px]", "tw:[&_.simple-item]:pr-[13px]",
    "tw:[&_.simple-item]:pb-[10px]", "tw:[&_.simple-item]:pl-[13px]",
  ].join(" "),
  "simple_item": sharedUtilities.simpleItem,
  "muted": sharedUtilities.muted,
  "data_table": sharedUtilities.dataTable,
} as const;
