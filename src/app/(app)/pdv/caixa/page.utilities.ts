import { managementControls } from "@/components/ui/management-controls";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "field": sharedUtilities.field,
  "sr_only": sharedUtilities.srOnly,
  "button_button_small": (sharedUtilities.buttonButtonSmall) + " " + managementControls.secondary,
  "button_button_primary": (sharedUtilities.buttonButtonPrimary) + " " + managementControls.primary,
  "muted": sharedUtilities.muted,
  "button_button_danger": (sharedUtilities.buttonButtonDanger) + " " + managementControls.danger,
} as const;
