import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "muted": sharedUtilities.muted,
  "active_event_list": [
    "active-event-list", "ranking-active-list", "tw:grid", "tw:grid-cols-[repeat(auto-fit,_minmax(270px,_360px))]",
    "tw:viewport-760:grid-cols-[1fr]", "tw:gap-y-[14px]", "tw:gap-x-[14px]", "tw:[justify-content:start]",
  ].join(" "),
  "active_event_row": [
    "active-event-row", "ranking-active-row", "tw:grid", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:min-h-[150px]", "tw:viewport-760:min-h-[0]", "tw:pt-[18px]",
    "tw:pr-[18px]", "tw:pb-[18px]", "tw:pl-[18px]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:#dce7f2]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:#dce7f2]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dce7f2]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:#dce7f2]", "tw:rounded-[14px]",
    "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:[box-shadow:0_8px_22px_rgb(19_55_104_/_.055)]", "tw:[&_>_div:first-child]:grid",
    "tw:[&_>_div:first-child]:[align-content:start]", "tw:[&_>_div:first-child]:gap-y-[5px]", "tw:[&_>_div:first-child]:gap-x-[5px]", "tw:viewport-760:items-start",
    "tw:viewport-760:flex-col", "tw:[&_strong]:block", "tw:[&_strong]:text-[color:#132d58]", "tw:[&_strong]:text-[1rem]",
    "tw:[&_span]:block", "tw:[&_span]:mt-[0]", "tw:[&_span]:mr-[0]", "tw:[&_span]:mb-[0]",
    "tw:[&_span]:ml-[0]", "tw:[&_span]:text-[color:#7184a5]", "tw:[&_span]:text-[.78rem]",
  ].join(" "),
  "button": sharedUtilities.button,
} as const;
