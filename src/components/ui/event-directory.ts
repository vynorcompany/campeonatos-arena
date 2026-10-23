/** Shared compact list presentation for competition directories. */
export const eventDirectoryStyles = {
  list: "event-directory tw:grid tw:min-w-0 tw:rounded-[10px] tw:border tw:border-[var(--line)] tw:bg-white",
  row: "event-directory-row tw:grid tw:min-w-0 tw:items-center tw:gap-3 tw:border-b tw:border-[var(--line)] tw:px-3 tw:py-3 tw:last:border-b-0 tw:[&>*]:min-w-0 tw:[&_strong]:break-words tw:[&_h3]:m-0 tw:[&_h3]:text-[13px] tw:[&_h3]:font-semibold tw:[&_h3]:text-[var(--ink)] tw:[&_span]:text-xs tw:[&_small]:text-[11px]",
} as const;
