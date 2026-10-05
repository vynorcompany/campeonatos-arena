import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "card": [
    "card", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[10px]", "tw:bg-[color:var(--panel)]", "tw:[background-image:none]",
    "tw:[box-shadow:0_5px_16px_rgba(19,_48,_83,_0.05)]", "tw:[animation:rise-in_620ms_var(--ease-standard)_both]", "tw:pt-[24px]", "tw:pr-[24px]",
    "tw:pb-[24px]", "tw:pl-[24px]", "tw:[&_h2]:mt-[0]", "tw:[&_h2]:mr-[0]",
    "tw:[&_h2]:mb-[0]", "tw:[&_h2]:ml-[0]", "tw:[&_h2]:text-[1.35rem]", "tw:[&_h2]:leading-[1.2]",
    "tw:[&_h2]:tracking-[-0.03em]",
  ].join(" "),
  "stack_md": sharedUtilities.stackMd,
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "muted": sharedUtilities.muted,
} as const;
