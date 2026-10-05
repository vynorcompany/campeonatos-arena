import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "error_shell": [
    "error-shell", "tw:grid", "tw:place-items-center", "tw:min-h-[60vh]",
    "tw:pt-[32px]", "tw:pr-[20px]", "tw:pb-[32px]", "tw:pl-[20px]",
  ].join(" "),
  "error_card": [
    "error-card", "tw:w-[min(560px,_100%)]", "tw:grid", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:pt-[28px]", "tw:pr-[28px]", "tw:pb-[28px]",
    "tw:pl-[28px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-xl)]", "tw:bg-[color:transparent]", "tw:[background-image:radial-gradient(circle_at_top_right,_rgba(30,_94,_168,_0.08),_transparent_30%),_linear-gradient(180deg,_#ffffff,_#f8fbfe)]",
    "tw:[box-shadow:var(--shadow)]", "tw:[&_h1]:mt-[0]", "tw:[&_h1]:mr-[0]", "tw:[&_h1]:mb-[0]",
    "tw:[&_h1]:ml-[0]", "tw:[&_h1]:text-[clamp(1.8rem,_3vw,_2.5rem)]", "tw:[&_h1]:leading-[1.02]", "tw:[&_h1]:tracking-[-0.04em]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "section_actions": sharedUtilities.sectionActions,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
