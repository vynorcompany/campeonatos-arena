import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "setting_create_panel": [
    "setting-create-panel", "tw:mb-[14px]", "tw:[&_>_summary]:w-[fit-content]", "tw:[&_>_summary]:[list-style:none]",
    "tw:[&_>_summary]:cursor-pointer", "tw:[&_>_summary::-webkit-details-marker]:hidden", "tw:[&_>_div]:mt-[12px]",
  ].join(" "),
  "button_button_primary_button_small": sharedUtilities.buttonButtonPrimaryButtonSmall,
  "user_search_form": [
    "user-search-form", "tw:grid", "tw:gap-y-[7px]", "tw:gap-x-[7px]",
    "tw:max-w-[520px]", "tw:[&_label]:text-[color:var(--muted)]", "tw:[&_label]:text-[.78rem]", "tw:[&_label]:font-[700]",
    "tw:[&_>_div]:flex", "tw:[&_>_div]:flex-wrap", "tw:[&_>_div]:gap-y-[8px]", "tw:[&_>_div]:gap-x-[8px]",
    "tw:[&_input]:[flex:1_1_220px]", "tw:[&_input]:min-w-[0]", "tw:[&_input]:min-h-[34px]",
  ].join(" "),
  "button_button_small": sharedUtilities.buttonButtonSmall,
  "muted": sharedUtilities.muted,
  "user_table_scroll": [
    "user-table-scroll", "tw:min-[761px]:rounded-lg", "tw:min-[761px]:border", "tw:border-[var(--line)]", "tw:max-w-[100%]", "tw:[overflow-x:auto]", "tw:[&_.data-table]:min-w-[580px]",
    "tw:viewport-760:[overflow-x:visible]", "tw:viewport-760:[&_.data-table]:min-w-0!", "tw:viewport-760:[&_.data-table]:w-full",
    "tw:viewport-760:[&_.data-table_thead]:hidden", "tw:viewport-760:[&_.data-table_tbody]:grid", "tw:viewport-760:[&_.data-table_tbody]:gap-3",
    "tw:viewport-760:[&_.data-table_tbody_tr]:grid", "tw:viewport-760:[&_.data-table_tbody_tr]:min-w-0", "tw:viewport-760:[&_.data-table_tbody_tr]:gap-3",
    "tw:viewport-760:[&_.data-table_tbody_tr]:rounded-xl", "tw:viewport-760:[&_.data-table_tbody_tr]:border", "tw:viewport-760:[&_.data-table_tbody_tr]:border-[#dce7f1]", "tw:viewport-760:[&_.data-table_tbody_tr]:p-4",
    "tw:viewport-760:[&_.data-table_tbody_td]:block", "tw:viewport-760:[&_.data-table_tbody_td]:min-w-0", "tw:viewport-760:[&_.data-table_tbody_td]:p-0!", "tw:viewport-760:[&_.data-table_tbody_td]:border-0!",
    "tw:viewport-760:[&_.data-table_tbody_td:first-child]:[overflow-wrap:anywhere]", "tw:viewport-760:[&_.data-table_tbody_td:last-child]:border-t!", "tw:viewport-760:[&_.data-table_tbody_td:last-child]:border-[#e8eef4]!", "tw:viewport-760:[&_.data-table_tbody_td:last-child]:pt-3!",
  ].join(" "),
  "data_table": sharedUtilities.dataTable + " tw:table-fixed tw:[&_thead_th]:bg-[#174983] tw:[&_thead_th]:text-white! tw:[&_thead_th]:py-3! tw:[&_th:first-child]:w-[42%] tw:[&_th:nth-child(2)]:w-[28%] tw:[&_th:last-child]:w-[30%] tw:[&_td:first-child]:[overflow-wrap:anywhere]",
  "table_subtext": sharedUtilities.tableSubtext,
  "user_mobile_label": "tw:hidden tw:viewport-760:block tw:viewport-760:mb-1 tw:viewport-760:text-[.7rem] tw:viewport-760:font-bold tw:viewport-760:uppercase tw:viewport-760:tracking-[.08em] tw:viewport-760:text-[color:var(--muted)]",
  "user_invites_list": [
    "user-invites-list", "tw:grid", "tw:gap-y-[8px]", "tw:gap-x-[8px]",
  ].join(" "),
  "user_invite_row": [
    "user-invite-row", "tw:flex", "tw:items-center", "tw:flex-wrap",
    "tw:gap-y-[10px]", "tw:gap-x-[16px]", "tw:pt-[12px]", "tw:pr-[12px]",
    "tw:pb-[12px]", "tw:pl-[12px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#dce7f1]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#dce7f1]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dce7f1]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#dce7f1]", "tw:rounded-[8px]", "tw:bg-white",
    "tw:[background-image:none]", "tw:[&_>_div]:grid", "tw:[&_>_div]:gap-y-[3px]", "tw:[&_>_div]:gap-x-[3px]",
    "tw:[&_>_div]:min-w-[min(100%,_230px)]", "tw:[&_>_div]:mr-[auto]", "tw:[&_>_div_span]:text-[color:#64788c]", "tw:[&_>_div_span]:text-[.78rem]",
    "tw:[&_>_div_span]:[overflow-wrap:anywhere]", "tw:[&_>_span]:text-[color:#64788c]", "tw:[&_>_span]:text-[.78rem]", "tw:[&_>_span]:[overflow-wrap:anywhere]",
  ].join(" "),
} as const;
