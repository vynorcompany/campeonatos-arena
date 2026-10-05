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
    "user-table-scroll", "tw:max-w-[100%]", "tw:[overflow-x:auto]", "tw:[&_.data-table]:min-w-[580px]",
  ].join(" "),
  "data_table": sharedUtilities.dataTable,
  "table_subtext": sharedUtilities.tableSubtext,
  "user_invites_list": [
    "user-invites-list", "tw:grid", "tw:gap-y-[8px]", "tw:gap-x-[8px]",
  ].join(" "),
  "user_invite_row": [
    "user-invite-row", "tw:flex", "tw:items-center", "tw:flex-wrap",
    "tw:gap-y-[10px]", "tw:gap-x-[16px]", "tw:pt-[12px]", "tw:pr-[12px]",
    "tw:pb-[12px]", "tw:pl-[12px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#dce7f1]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#dce7f1]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dce7f1]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#dce7f1]", "tw:rounded-[8px]", "tw:bg-[color:#f8fbff]",
    "tw:[background-image:none]", "tw:[&_>_div]:grid", "tw:[&_>_div]:gap-y-[3px]", "tw:[&_>_div]:gap-x-[3px]",
    "tw:[&_>_div]:min-w-[min(100%,_230px)]", "tw:[&_>_div]:mr-[auto]", "tw:[&_>_div_span]:text-[color:#64788c]", "tw:[&_>_div_span]:text-[.78rem]",
    "tw:[&_>_div_span]:[overflow-wrap:anywhere]", "tw:[&_>_span]:text-[color:#64788c]", "tw:[&_>_span]:text-[.78rem]", "tw:[&_>_span]:[overflow-wrap:anywhere]",
  ].join(" "),
} as const;
