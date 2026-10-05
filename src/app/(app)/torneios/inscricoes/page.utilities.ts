import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "muted": sharedUtilities.muted,
  "stack_md": sharedUtilities.stackMd,
  "page_header": sharedUtilities.pageHeader,
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "simple_list": sharedUtilities.simpleList,
  "simple_item": sharedUtilities.simpleItem,
  "section_actions": sharedUtilities.sectionActions,
  "button": sharedUtilities.button,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "stack_xs_2": [
    "stack-xs", "tw:[width:100%]", "tw:grid", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]",
  ].join(" "),
  "grid_form": [
    "grid-form", "tw:[margin-top:0.75rem]", "tw:grid", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:grid-cols-[repeat(3,_minmax(0,_1fr))]", "tw:viewport-1120:grid-cols-[1fr]", "tw:[&_textarea]:w-[100%]",
    "tw:[&_textarea]:pt-[12px]", "tw:[&_textarea]:pr-[14px]", "tw:[&_textarea]:pb-[12px]", "tw:[&_textarea]:pl-[14px]",
    "tw:[&_textarea]:border-t-[length:1px]", "tw:[&_textarea]:[border-top-style:solid]", "tw:[&_textarea]:border-t-[color:var(--line)]", "tw:[&_textarea]:border-r-[length:1px]",
    "tw:[&_textarea]:[border-right-style:solid]", "tw:[&_textarea]:border-r-[color:var(--line)]", "tw:[&_textarea]:border-b-[length:1px]", "tw:[&_textarea]:[border-bottom-style:solid]",
    "tw:[&_textarea]:border-b-[color:var(--line)]", "tw:[&_textarea]:border-l-[length:1px]", "tw:[&_textarea]:[border-left-style:solid]", "tw:[&_textarea]:border-l-[color:var(--line)]",
    "tw:[&_textarea]:rounded-[var(--radius-md)]", "tw:[&_textarea]:bg-[color:var(--panel)]", "tw:[&_textarea]:[background-image:none]", "tw:[&_textarea]:text-[color:var(--text)]",
  ].join(" "),
  "field": sharedUtilities.field,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
} as const;
