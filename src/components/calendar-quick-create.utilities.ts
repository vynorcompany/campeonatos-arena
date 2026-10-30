import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "calendar_create_form": [
    "calendar-create-form", "tw:grid", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "field": sharedUtilities.field,
  "muted": sharedUtilities.muted,
  "calendar_create_actions": [
    "calendar-create-actions", "tw:flex", "tw:flex-wrap", "tw:justify-end", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]", "tw:mt-[4px]",
  ].join(" "),
  "button": sharedUtilities.button,
  "button_button_danger": sharedUtilities.buttonButtonDanger,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
