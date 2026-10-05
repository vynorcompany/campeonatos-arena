import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "auth_page": [
    "auth-page", "tw:min-h-[100vh]", "tw:grid", "tw:place-items-center",
    "tw:pt-[32px]", "tw:pr-[20px]", "tw:pb-[32px]", "tw:pl-[20px]",
  ].join(" "),
  "auth_card_stack_md": [
    "auth-card", "stack-md", "tw:w-[min(460px,_100%)]", "tw:pt-[32px]",
    "tw:pr-[32px]", "tw:pb-[32px]", "tw:pl-[32px]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-xl)]",
    "tw:bg-[color:var(--panel)]", "tw:[background-image:none]", "tw:[box-shadow:var(--shadow)]", "tw:[animation:rise-in_680ms_var(--ease-standard)]",
    "tw:[&::before]:[content:'']", "tw:[&::before]:block", "tw:[&::before]:w-[56px]", "tw:[&::before]:h-[6px]",
    "tw:[&::before]:mb-[24px]", "tw:[&::before]:rounded-[999px]", "tw:[&::before]:bg-[color:transparent]", "tw:[&::before]:[background-image:linear-gradient(90deg,_var(--brand),_#4f8cd0)]",
    "tw:[&::before]:[animation:line-grow_700ms_140ms_var(--ease-standard)_both]", "tw:[&_h1]:mt-[0]", "tw:[&_h1]:mr-[0]", "tw:[&_h1]:mb-[0]",
    "tw:[&_h1]:ml-[0]", "tw:[&_h1]:text-[1.35rem]", "tw:[&_h1]:leading-[1.2]", "tw:[&_h1]:tracking-[-0.03em]",
    "tw:grid", "tw:gap-y-[18px]", "tw:gap-x-[18px]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]",
    "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]", "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]", "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]", "tw:[&_>_.section-card:last-child]:border-b-[length:1px]",
    "tw:[&_>_.section-card:last-child]:[border-bottom-style:solid]", "tw:[&_>_.section-card:last-child]:border-b-[color:var(--line)]",
  ].join(" "),
  "auth_logo_wrap": [
    "auth-logo-wrap", "tw:flex", "tw:justify-center", "tw:mt-[-4px]",
  ].join(" "),
  "auth_logo": [
    "auth-logo", "tw:rounded-[24px]", "tw:[box-shadow:0_14px_28px_rgba(19,_37,_62,_0.14)]",
  ].join(" "),
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "auth_switch": sharedUtilities.authSwitch,
} as const;
