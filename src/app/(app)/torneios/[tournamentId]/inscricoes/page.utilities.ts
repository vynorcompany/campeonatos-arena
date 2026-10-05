import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "tournament_management_page_stack_md": sharedUtilities.tournamentManagementPageStackMd,
  "page_header_tournament_management_header": sharedUtilities.pageHeaderTournamentManagementHeader,
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "button": sharedUtilities.button,
  "section_card": sharedUtilities.sectionCard2,
  "tournament_registration_filters": [
    "tournament-registration-filters", "tw:grid", "tw:grid-cols-[minmax(220px,_1.4fr)_repeat(2,_minmax(160px,_.7fr))_auto]", "tw:viewport-760:grid-cols-[1fr]",
    "tw:gap-y-[10px]", "tw:gap-x-[10px]", "tw:pb-[18px]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#e3ebf4]",
  ].join(" "),
  "tournament_registration_list": [
    "tournament-registration-list", "tw:grid", "tw:gap-y-[10px]", "tw:gap-x-[10px]",
    "tw:pt-[16px]",
  ].join(" "),
  "tournament_registration_row": [
    "tournament-registration-row", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#dce7f3]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#dce7f3]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dce7f3]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#dce7f3]", "tw:rounded-[12px]", "tw:bg-[color:#fff]", "tw:[background-image:none]",
    "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]", "tw:[&_summary]:grid", "tw:[&_summary]:grid-cols-[34px_minmax(220px,_1fr)_120px_170px]",
    "tw:viewport-760:[&_summary]:grid-cols-[30px_minmax(0,_1fr)]", "tw:[&_summary]:items-center", "tw:[&_summary]:gap-y-[16px]", "tw:[&_summary]:gap-x-[16px]",
    "tw:[&_summary]:pt-[16px]", "tw:[&_summary]:pr-[16px]", "tw:[&_summary]:pb-[16px]", "tw:[&_summary]:pl-[16px]",
    "tw:[&_summary]:cursor-pointer", "tw:[&_summary]:[list-style:none]", "tw:[&_summary::-webkit-details-marker]:hidden", "tw:[&_summary_small]:block",
    "tw:[&_summary_small]:mt-[3px]", "tw:[&_summary_small]:text-[color:#617997]", "tw:viewport-760:[&_summary_>_span:not(.registration-order)]:[grid-column:2]",
  ].join(" "),
  "registration_order": [
    "registration-order", "tw:grid", "tw:place-items-center", "tw:w-[28px]",
    "tw:h-[28px]", "tw:rounded-[50%]", "tw:text-[color:var(--brand)]", "tw:bg-[color:#eaf2ff]",
    "tw:[background-image:none]", "tw:text-[.8rem]", "tw:font-[800]",
  ].join(" "),
  "status_confirmed": [
    "status-confirmed", "tw:inline-flex", "tw:w-[fit-content]", "tw:pt-[5px]",
    "tw:pr-[9px]", "tw:pb-[5px]", "tw:pl-[9px]", "tw:rounded-[999px]",
    "tw:text-[.78rem]", "tw:font-[800]", "tw:text-[color:#087a46]", "tw:bg-[color:#e4f8ee]",
    "tw:[background-image:none]",
  ].join(" "),
  "status_pending": [
    "status-pending", "tw:inline-flex", "tw:w-[fit-content]", "tw:pt-[5px]",
    "tw:pr-[9px]", "tw:pb-[5px]", "tw:pl-[9px]", "tw:rounded-[999px]",
    "tw:text-[.78rem]", "tw:font-[800]", "tw:text-[color:#996200]", "tw:bg-[color:#fff3db]",
    "tw:[background-image:none]",
  ].join(" "),
  "tournament_registration_edit": [
    "tournament-registration-edit", "tw:grid", "tw:grid-cols-[repeat(4,_minmax(0,_1fr))]", "tw:viewport-760:grid-cols-[1fr]",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]", "tw:pt-[18px]", "tw:pr-[18px]",
    "tw:pb-[18px]", "tw:pl-[18px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#e5edf5]", "tw:bg-[color:#f8fbfe]", "tw:[background-image:none]", "tw:[&_label]:grid",
    "tw:[&_label]:gap-y-[6px]", "tw:[&_label]:gap-x-[6px]", "tw:[&_label]:text-[color:#354e6d]", "tw:[&_label]:text-[.82rem]",
    "tw:[&_label]:font-[700]", "tw:[&_.button]:[align-self:end]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
