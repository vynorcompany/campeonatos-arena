import { tournamentWorkspace as tws } from "@/components/tournaments/tournament-workspace";
/** Tailwind utilities for the archived League month list and its responsive dialog. */
export const viewStyles = {
  "panel": tws.page,
  "empty": "league-history-empty tw:grid tw:gap-2 tw:rounded-lg tw:border tw:border-[#b8c9dc] tw:bg-white tw:p-5 tw:text-[#172b45] tw:[&_strong]:text-sm tw:[&_strong]:font-medium tw:[&_span]:text-[13px] tw:[&_span]:text-[#465c75]",
  "panelHeader": "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#d5dfeb] tw:pb-3 tw:[&_h2]:m-0 tw:[&_h2]:text-base tw:[&_h3]:m-0 tw:[&_h3]:text-base tw:[&_h3]:font-medium",
  "list": "tw:grid tw:min-w-0 tw:gap-0 tw:rounded-lg tw:border tw:border-[var(--line)]",
  "month": "tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] tw:items-center tw:gap-3 tw:border-0 tw:border-b tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-2 tw:text-left tw:text-[13px] tw:text-[var(--text)] tw:cursor-pointer tw:[&_strong]:font-medium tw:[&_small]:text-xs tw:[&_small]:text-[var(--muted)] tw:max-[760px]:grid-cols-1",
  "view": "tw:text-[13px] tw:font-normal tw:text-[#174983]",
  dialogBody: "tw:grid tw:min-w-0 tw:gap-4",
  "highlights": "tw:flex tw:min-w-0 tw:flex-wrap tw:gap-4 tw:rounded-md tw:border tw:border-[#d0dce9] tw:bg-[#ffffff] tw:p-4 tw:[&>div]:grid tw:[&>div]:min-w-0 tw:[&>div]:gap-1 tw:[&_span]:text-xs tw:[&_span]:text-[#465c75] tw:[&_strong]:text-sm tw:[&_strong]:font-medium tw:[&_strong]:break-words",
  tableHeader: "tw:mt-[24px] tw:mb-[10px] tw:flex tw:items-center tw:justify-between tw:gap-[16px] tw:[&_h3]:m-0 tw:[&_h3]:text-[1rem] tw:[&_span]:text-[.82rem] tw:[&_span]:text-[color:var(--muted)] tw:max-[560px]:flex-col tw:max-[560px]:items-start tw:max-[560px]:gap-[3px]",
  tableWrap: "tw:w-full tw:overflow-x-auto tw:rounded-[11px] tw:border tw:border-[color:var(--line)]",
  "table": tws.table,
  badge: "tw:ml-[7px] tw:inline-block tw:rounded-[5px] tw:bg-[#e8f8ee] tw:px-[6px] tw:py-[2px] tw:text-[.67rem] tw:text-[#137245] tw:whitespace-nowrap tw:max-[560px]:mt-[4px] tw:max-[560px]:mr-[4px] tw:max-[560px]:ml-0",
  relegated: "tw:ml-[7px] tw:inline-block tw:rounded-[5px] tw:bg-[#fff0ec] tw:px-[6px] tw:py-[2px] tw:text-[.67rem] tw:text-[#ae3829] tw:whitespace-nowrap tw:max-[560px]:mt-[4px] tw:max-[560px]:mr-[4px] tw:max-[560px]:ml-0",
  "missing": "tw:m-0 tw:text-[13px] tw:leading-relaxed tw:text-[#465c75]",
  "reopen": tws.warning,
} as const;
