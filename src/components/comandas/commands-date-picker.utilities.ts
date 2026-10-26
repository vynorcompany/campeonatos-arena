const focus = "tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[var(--primary)]";
export const viewStyles = {
  commands_icon: "commands-icon tw:size-4 tw:shrink-0",
  commands_date_trigger: "commands-date-trigger tw:flex tw:min-h-11 tw:min-w-0 tw:items-center tw:gap-3 tw:rounded-sm tw:border tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-2 tw:text-left tw:text-[var(--text)] tw:cursor-pointer tw:hover:border-[#7894ae] tw:viewport-760:w-full " + focus,
  commands_date_icon: "commands-date-icon tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:border-r tw:border-[var(--line)] tw:pr-3 tw:text-[#52677d]",
  commands_date_copy: "commands-date-copy tw:grid tw:min-w-0 tw:gap-0.5 tw:[&>span]:text-[10px] tw:[&>span]:text-[var(--muted)] tw:[&>strong]:text-sm tw:[&>strong]:font-semibold tw:[&>strong]:capitalize",
  commands_date_chevron: "tw:ml-auto tw:text-[var(--muted)]",
  commands_calendar_grid: "commands-calendar-grid tw:grid tw:grid-cols-7 tw:gap-1 tw:[&>span]:py-2 tw:[&>span]:text-center tw:[&>span]:text-[10px] tw:[&>span]:font-medium tw:[&>span]:text-[var(--muted)]",
  commands_calendar_day: "commands-calendar-day tw:relative tw:grid tw:min-h-9 tw:min-w-0 tw:place-items-center tw:cursor-pointer tw:rounded-sm tw:border tw:border-transparent tw:bg-transparent tw:text-xs tw:text-[var(--text)] tw:hover:border-[var(--line)] tw:hover:bg-slate-50 " + focus,
  commands_calendar_day_active: "commands-calendar-day-active tw:border-[#087443]! tw:bg-[#087443]! tw:text-white!",
  commands_calendar_day_muted: "commands-calendar-day-muted tw:text-[#69778a]!",
  calendar_open_indicator: "calendar-open-indicator tw:absolute tw:right-1 tw:top-1 tw:size-1 tw:bg-[#b42318]",
  month_button: "tw:grid tw:min-h-9 tw:min-w-9 tw:cursor-pointer tw:place-items-center tw:rounded-sm tw:border tw:border-[var(--line)] tw:bg-white tw:px-2 tw:text-sm tw:text-[var(--text)] tw:hover:bg-slate-50 " + focus,
} as const;
