import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "grid_form": sharedUtilities.gridForm,
  "field": sharedUtilities.field,
  "field_form_full": sharedUtilities.fieldFormFull,
  "form_full_section_actions": [
    "form-full", "section-actions", "tw:[grid-column:1_/_-1]", "tw:flex",
    "tw:flex-wrap", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error_form_full": sharedUtilities.formErrorFormFull,
} as const;
