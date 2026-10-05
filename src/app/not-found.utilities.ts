import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": [
    "stack-md", "tw:[min-height:100vh]", "tw:[padding:1.5rem]", "tw:grid",
    "tw:gap-y-[18px]", "tw:gap-x-[18px]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]", "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]",
    "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]", "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]", "tw:[&_>_.section-card:last-child]:border-b-[length:1px]", "tw:[&_>_.section-card:last-child]:[border-bottom-style:solid]",
    "tw:[&_>_.section-card:last-child]:border-b-[color:var(--line)]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "section_actions": [
    "section-actions", "tw:[margin-top:1rem]", "tw:flex", "tw:flex-wrap",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "button": sharedUtilities.button,
} as const;
