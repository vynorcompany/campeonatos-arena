import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "field": sharedUtilities.field,
  "form_error": sharedUtilities.formError,
  "button_button_primary_button_block": sharedUtilities.buttonButtonPrimaryButtonBlock,
} as const;
