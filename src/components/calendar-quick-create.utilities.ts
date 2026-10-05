import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "calendar_create_overlay": [
    "calendar-create-overlay", "tw:fixed", "tw:top-[0]", "tw:right-[0]",
    "tw:bottom-[0]", "tw:left-[0]", "tw:z-[80]", "tw:grid",
    "tw:place-items-center", "tw:bg-[color:rgba(14,_24,_38,_0.28)]", "tw:[background-image:none]", "tw:[backdrop-filter:blur(2px)]",
  ].join(" "),
  "calendar_create_card": [
    "calendar-create-card", "tw:relative", "tw:w-[min(520px,_calc(100vw_-_24px))]", "tw:pt-[20px]",
    "tw:pr-[20px]", "tw:pb-[20px]", "tw:pl-[20px]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]", "tw:rounded-[24px]",
    "tw:bg-[color:#f3f6fb]", "tw:[background-image:none]", "tw:[box-shadow:0_24px_56px_rgba(22,_36,_56,_0.28)]", "tw:[&_h3]:mt-[0]",
    "tw:[&_h3]:mr-[0]", "tw:[&_h3]:mb-[14px]", "tw:[&_h3]:ml-[0]", "tw:[&_h3]:text-[1.55rem]",
    "tw:[&_h3]:tracking-[-0.03em]",
  ].join(" "),
  "calendar_create_close": [
    "calendar-create-close", "tw:absolute", "tw:top-[10px]", "tw:right-[12px]",
    "tw:w-[32px]", "tw:h-[32px]", "tw:border-t-[length:0]", "tw:[border-top-style:none]",
    "tw:border-t-[color:currentColor]", "tw:border-r-[length:0]", "tw:[border-right-style:none]", "tw:border-r-[color:currentColor]",
    "tw:border-b-[length:0]", "tw:[border-bottom-style:none]", "tw:border-b-[color:currentColor]", "tw:border-l-[length:0]",
    "tw:[border-left-style:none]", "tw:border-l-[color:currentColor]", "tw:rounded-[999px]", "tw:bg-[color:transparent]",
    "tw:[background-image:none]", "tw:text-[color:#5a6a80]", "tw:text-[1.8rem]", "tw:leading-[1]",
  ].join(" "),
  "calendar_create_form": [
    "calendar-create-form", "tw:grid", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "field": sharedUtilities.field,
  "muted": sharedUtilities.muted,
  "calendar_create_actions": [
    "calendar-create-actions", "tw:flex", "tw:justify-end", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]", "tw:mt-[4px]",
  ].join(" "),
  "button": sharedUtilities.button,
  "button_button_danger": sharedUtilities.buttonButtonDanger,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
