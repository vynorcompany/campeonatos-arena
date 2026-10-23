import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "muted": sharedUtilities.muted,
  "active_event_list": "active-event-list ranking-active-list tw:grid tw:grid-cols-1 tw:gap-0 tw:overflow-hidden tw:rounded-xl tw:border tw:border-[#dce7f2] tw:bg-white",
  "active_event_row": "active-event-row ranking-active-row tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-4 tw:border-b tw:border-[#e8eef5] tw:px-5 tw:py-4 tw:last:border-b-0 tw:hover:bg-[#f7faff] tw:[&>div]:min-w-0 tw:[&_strong]:block tw:[&_strong]:break-words tw:[&_strong]:text-sm tw:[&_strong]:text-[#132d58] tw:[&_span]:mt-1 tw:[&_span]:block tw:[&_span]:text-xs tw:[&_span]:text-[#607898] tw:[&_small]:mt-1 tw:[&_small]:block tw:[&_small]:text-xs tw:[&_small]:text-[#607898] tw:viewport-760:px-3",
  "button": sharedUtilities.button,
} as const;
