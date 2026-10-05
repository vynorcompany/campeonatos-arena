import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "t_empty_state": [
    "t-empty-state", "tw:border-t-[length:1px]", "tw:[border-top-style:dashed]", "tw:border-t-[color:var(--line-strong)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:dashed]", "tw:border-r-[color:var(--line-strong)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:dashed]", "tw:border-b-[color:var(--line-strong)]", "tw:border-l-[length:1px]", "tw:[border-left-style:dashed]",
    "tw:border-l-[color:var(--line-strong)]", "tw:rounded-[16px]", "tw:pt-[26px]", "tw:pr-[26px]",
    "tw:pb-[26px]", "tw:pl-[26px]", "tw:bg-[color:#fbfdff]", "tw:[background-image:none]",
    "tw:grid", "tw:gap-y-[10px]", "tw:gap-x-[10px]", "tw:[justify-items:start]",
    "tw:[&_p]:mt-[0]", "tw:[&_p]:mr-[0]", "tw:[&_p]:mb-[0]", "tw:[&_p]:ml-[0]",
    "tw:[&_p]:text-[color:var(--muted)]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
