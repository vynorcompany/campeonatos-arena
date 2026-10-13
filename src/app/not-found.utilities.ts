import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": [
    "tw:min-h-dvh", "tw:flex", "tw:items-start", "tw:justify-center", "tw:px-4", "tw:py-6",
    "tw:viewport-700:px-6", "tw:viewport-700:py-10", "tw:[&_.section-card]:w-full", "tw:[&_.section-card]:max-w-[560px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "section_actions": [
    "section-actions", "tw:[margin-top:1rem]", "tw:flex", "tw:flex-wrap",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "button": sharedUtilities.button,
} as const;
