import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "grid_form": sharedUtilities.gridForm,
  "field": sharedUtilities.field,
  "field_form_full": sharedUtilities.fieldFormFull,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "teacher_grid": [
    "teacher-grid", "tw:grid", "tw:gap-y-[14px]", "tw:gap-x-[14px]",
    "tw:grid-cols-[repeat(3,_minmax(0,_1fr))]", "tw:viewport-1120:grid-cols-[1fr]",
  ].join(" "),
  "teacher_card": [
    "teacher-card", "tw:grid", "tw:gap-y-[14px]", "tw:gap-x-[14px]",
    "tw:pt-[18px]", "tw:pr-[18px]", "tw:pb-[18px]", "tw:pl-[18px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]",
    "tw:rounded-[var(--radius-md)]", "tw:bg-[color:#ffffff]", "tw:[background-image:none]", "tw:[&_h3]:mt-[4px]",
    "tw:[&_h3]:mr-[0]", "tw:[&_h3]:mb-[0]", "tw:[&_h3]:ml-[0]", "tw:[&_h3]:text-[1.12rem]",
    "tw:[&_h3]:leading-[1.25]",
  ].join(" "),
  "match_card_top": [
    "match-card-top", "tw:flex", "tw:viewport-760:grid", "tw:items-start",
    "tw:justify-between", "tw:gap-y-[16px]", "tw:gap-x-[16px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "teacher_metrics": [
    "teacher-metrics", "tw:flex", "tw:gap-y-[8px]", "tw:gap-x-[8px]",
    "tw:flex-wrap", "tw:[&_span]:inline-flex", "tw:[&_span]:items-center", "tw:[&_span]:min-h-[30px]",
    "tw:[&_span]:pt-[0]", "tw:[&_span]:pr-[10px]", "tw:[&_span]:pb-[0]", "tw:[&_span]:pl-[10px]",
    "tw:[&_span]:rounded-[999px]", "tw:[&_span]:text-[0.86rem]", "tw:[&_span]:font-[700]", "tw:[&_span]:bg-[color:var(--brand-soft)]",
    "tw:[&_span]:[background-image:none]", "tw:[&_span]:text-[color:var(--brand-strong)]",
  ].join(" "),
  "muted": sharedUtilities.muted,
} as const;
