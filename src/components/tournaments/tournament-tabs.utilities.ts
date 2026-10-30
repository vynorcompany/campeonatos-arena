/** Shared category navigation follows the Arena contrast and wraps on narrow screens. */
export const viewStyles = {
  t_tabs: "t-tabs tw:flex tw:flex-wrap tw:gap-2 tw:border-b tw:border-[var(--line)] tw:pb-3",
  t_tab: "t-tab tw:inline-flex tw:min-h-10 tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-2 tw:text-sm tw:font-semibold tw:text-[#151515] tw:[&_.t-tab-icon]:size-4 tw:[&_.t-tab-icon_svg]:size-4 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#1e5ea8] tw:hover:border-[#1e5ea8]",
  t_tab_active: "t-tab-active tw:border-[#1e5ea8]! tw:bg-[#1e5ea8]! tw:text-white!",
} as const;
