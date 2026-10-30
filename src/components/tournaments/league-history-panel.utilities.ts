import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
/** Tailwind utilities for the archived League month list and its responsive dialog. */
export const viewStyles = {
  panel: "tw:rounded-lg tw:border tw:border-[color:var(--line)] tw:bg-white tw:p-4",
  empty: "tw:grid tw:gap-[6px] tw:rounded-lg tw:border tw:border-[color:var(--line)] tw:bg-white tw:p-4 tw:[&_span]:text-[color:var(--muted)]",
  panelHeader: "tw:flex tw:items-center tw:justify-between tw:gap-[16px] tw:[&_h2]:m-0 tw:[&>span]:text-[.85rem] tw:[&>span]:text-[color:var(--muted)]",
  list: "tw:mt-[18px] tw:grid tw:grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] tw:gap-[10px]",
  month: "tw:grid tw:min-w-0 tw:gap-[6px] tw:rounded-[12px] tw:border tw:border-[color:var(--line)] tw:bg-white tw:p-[16px] tw:text-left tw:font-[inherit] tw:cursor-pointer tw:hover:border-[color:var(--primary)] tw:focus-visible:border-[color:var(--primary)] tw:[&_strong]:[overflow-wrap:anywhere] tw:[&_small]:[overflow-wrap:anywhere] tw:[&_span]:text-[.84rem] tw:[&_small]:text-[.84rem] tw:[&_span]:text-[color:var(--muted)] tw:[&_small]:text-[color:var(--muted)]",
  view: "tw:mt-[6px] tw:font-[700] tw:!text-[color:var(--primary)]",
  dialogBody: "tw:grid tw:min-w-0 tw:gap-4",
  highlights: "tw:grid tw:grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] tw:gap-[10px] tw:[&>div]:grid tw:[&>div]:min-w-0 tw:[&>div]:gap-[5px] tw:[&>div]:rounded-[11px] tw:[&>div]:border tw:[&>div]:border-[color:var(--line)] tw:[&>div]:bg-white tw:[&>div]:p-[14px] tw:[&_span]:text-[.75rem] tw:[&_span]:text-[color:var(--muted)] tw:[&_strong]:[overflow-wrap:anywhere]",
  tableHeader: "tw:mt-[24px] tw:mb-[10px] tw:flex tw:items-center tw:justify-between tw:gap-[16px] tw:[&_h3]:m-0 tw:[&_h3]:text-[1rem] tw:[&_span]:text-[.82rem] tw:[&_span]:text-[color:var(--muted)] tw:max-[560px]:flex-col tw:max-[560px]:items-start tw:max-[560px]:gap-[3px]",
  tableWrap: "tw:w-full tw:overflow-x-auto tw:rounded-[11px] tw:border tw:border-[color:var(--line)]",
  table: "tw:w-full tw:border-collapse tw:text-[.86rem] tw:[&_th]:border-b tw:[&_th]:border-[color:var(--line)] tw:[&_td]:border-b tw:[&_td]:border-[color:var(--line)] tw:[&_th]:px-[12px] tw:[&_th]:py-[11px] tw:[&_td]:px-[12px] tw:[&_td]:py-[11px] tw:[&_th]:text-left tw:[&_td:not(:first-child)]:text-center tw:[&_thead]:bg-[#174983] tw:[&_thead]:text-white tw:[&_thead_th:not(:nth-child(2))]:text-center tw:[&_tbody_th]:min-w-[160px] tw:[&_tbody_th]:[overflow-wrap:anywhere] tw:[&_tbody_tr:last-child_th]:border-b-0 tw:[&_tbody_tr:last-child_td]:border-b-0 tw:max-[560px]:[&_th]:px-[7px] tw:max-[560px]:[&_th]:py-[9px] tw:max-[560px]:[&_td]:px-[7px] tw:max-[560px]:[&_td]:py-[9px] tw:max-[560px]:[&_tbody_th]:min-w-[130px]",
  badge: "tw:ml-[7px] tw:inline-block tw:rounded-[5px] tw:bg-[#e8f8ee] tw:px-[6px] tw:py-[2px] tw:text-[.67rem] tw:text-[#137245] tw:whitespace-nowrap tw:max-[560px]:mt-[4px] tw:max-[560px]:mr-[4px] tw:max-[560px]:ml-0",
  relegated: "tw:ml-[7px] tw:inline-block tw:rounded-[5px] tw:bg-[#fff0ec] tw:px-[6px] tw:py-[2px] tw:text-[.67rem] tw:text-[#ae3829] tw:whitespace-nowrap tw:max-[560px]:mt-[4px] tw:max-[560px]:mr-[4px] tw:max-[560px]:ml-0",
  missing: "tw:text-[.86rem] tw:text-[color:var(--muted)]",
  reopen: "tw:mt-[18px] tw:rounded-[8px] tw:border tw:border-[color:var(--line)] tw:bg-transparent tw:px-[12px] tw:py-[9px] tw:text-inherit tw:cursor-pointer",
} as const;
