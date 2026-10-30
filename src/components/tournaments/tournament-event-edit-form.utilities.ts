import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";

export const viewStyles = {
  grid_form: "tw:grid tw:min-w-0 tw:gap-3 tw:[&_input]:w-full tw:[&_textarea]:w-full tw:[&_textarea]:min-w-0 tw:[&_textarea]:rounded-md tw:[&_textarea]:border tw:[&_textarea]:border-[var(--line)] tw:[&_textarea]:bg-white tw:[&_textarea]:p-2 tw:[&_textarea]:text-sm",
  field: ui.field,
  field_form_full: ui.field,
  event_rules_editor: "event-rules-editor tw:min-h-[180px] tw:resize-y tw:leading-relaxed",
  field_field_submit_form_full: "tw:flex tw:justify-end tw:border-t tw:border-[var(--line)] tw:pt-3",
  button_button_primary: ui.primary,
  form_error_form_full: sharedUtilities.formErrorFormFull,
  form_success_form_full: sharedUtilities.formSuccessFormFull,
} as const;
