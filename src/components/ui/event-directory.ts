/** Shared visual structure for tournament management and active events. */
export const eventDirectoryStyles = {
  list: "event-directory tw:grid tw:min-w-0 tw:gap-3",
  row: "event-directory-row tw:grid tw:min-w-0 tw:items-center tw:gap-5 tw:rounded-xl tw:border tw:border-[#dce7f2] tw:bg-white tw:p-5 tw:shadow-sm tw:[&>*]:min-w-0 tw:[&_strong]:break-words tw:[&_h3]:m-0 tw:[&_h3]:text-sm tw:[&_h3]:text-[#132d58] tw:[&_span]:text-sm tw:[&_small]:text-xs tw:viewport-760:gap-3 tw:viewport-760:p-4",
} as const;
