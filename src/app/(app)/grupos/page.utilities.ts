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
  "section_actions": sharedUtilities.sectionActions,
  "button": sharedUtilities.button,
  "form_hint_box": [
    "form-hint-box", "tw:pt-[16px]", "tw:pr-[16px]", "tw:pb-[16px]",
    "tw:pl-[16px]", "tw:border-t-[length:1px]", "tw:[border-top-style:dashed]", "tw:border-t-[color:var(--line-strong)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:dashed]", "tw:border-r-[color:var(--line-strong)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:dashed]", "tw:border-b-[color:var(--line-strong)]", "tw:border-l-[length:1px]", "tw:[border-left-style:dashed]",
    "tw:border-l-[color:var(--line-strong)]", "tw:rounded-[var(--radius-md)]", "tw:bg-[color:var(--panel-muted)]", "tw:[background-image:none]",
    "tw:[&_strong]:block", "tw:[&_strong]:mb-[6px]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "data_table": sharedUtilities.dataTable,
} as const;
