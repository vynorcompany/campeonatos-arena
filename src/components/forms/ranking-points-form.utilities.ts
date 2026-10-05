import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "grid_form": sharedUtilities.gridForm,
  "muted_form_full": sharedUtilities.mutedFormFull,
  "field": sharedUtilities.field,
  "section_actions_form_full": sharedUtilities.sectionActionsFormFull,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
