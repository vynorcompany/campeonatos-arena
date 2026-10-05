import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "field": sharedUtilities.field,
  "sr_only": sharedUtilities.srOnly,
  "button_button_small": sharedUtilities.buttonButtonSmall,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "muted": sharedUtilities.muted,
  "button_button_danger": sharedUtilities.buttonButtonDanger,
} as const;
