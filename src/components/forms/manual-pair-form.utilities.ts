import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "grid_form": sharedUtilities.gridForm,
  "field": sharedUtilities.field,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "sr_only": sharedUtilities.srOnly,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error_form_full": sharedUtilities.formErrorFormFull,
  "form_success_form_full": sharedUtilities.formSuccessFormFull,
} as const;
