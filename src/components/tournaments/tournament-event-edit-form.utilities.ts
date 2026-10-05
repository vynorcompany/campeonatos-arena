import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "grid_form": sharedUtilities.gridForm,
  "field": sharedUtilities.field,
  "field_form_full": sharedUtilities.fieldFormFull,
  "event_rules_editor": [
    "event-rules-editor", "tw:min-h-[280px]", "tw:[resize:vertical]", "tw:leading-[1.55]",
  ].join(" "),
  "field_field_submit_form_full": sharedUtilities.fieldFieldSubmitFormFull,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error_form_full": sharedUtilities.formErrorFormFull,
  "form_success_form_full": sharedUtilities.formSuccessFormFull,
} as const;
