import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "muted": sharedUtilities.muted,
  "active_event_list": "active-event-list ranking-active-list tw:grid tw:grid-cols-1 tw:gap-3",
  "active_event_row": "active-event-row ranking-active-row tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-4 tw:rounded-2xl tw:border tw:border-[#dce7f2] tw:bg-white tw:px-5 tw:py-5 tw:shadow-sm tw:hover:border-[#a9c7ef] tw:[&>div]:min-w-0 tw:[&_strong]:block tw:[&_strong]:break-words tw:[&_strong]:text-base tw:[&_strong]:text-[#132d58] tw:[&>div>div>span]:mt-1 tw:[&>div>div>span]:block tw:[&>div>div>span]:text-xs tw:[&>div>div>span]:text-[#607898] tw:[&_small]:mt-1 tw:[&_small]:block tw:[&_small]:text-xs tw:[&_small]:text-[#607898] tw:viewport-760:px-4 tw:viewport-760:grid-cols-1",
  "button": sharedUtilities.button + " tw:gap-3 tw:justify-center tw:border-[#c9dcf5] tw:bg-[#edf4ff] tw:text-[#0754c3] tw:font-semibold",
} as const;
