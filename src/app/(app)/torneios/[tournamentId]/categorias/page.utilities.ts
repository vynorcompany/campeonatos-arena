import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "tournament_management_page_stack_md": sharedUtilities.tournamentManagementPageStackMd,
  "page_header_tournament_management_header": sharedUtilities.pageHeaderTournamentManagementHeader,
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "button": sharedUtilities.button,
  "section_card_tournament_category_management_page": [
    "section-card", "tournament-category-management-page", "tw:pt-[24px]", "tw:pr-[24px]",
    "tw:pb-[24px]", "tw:pl-[24px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:var(--line)]", "tw:border-r-[length:0]", "tw:[border-right-style:none]", "tw:border-r-[color:currentColor]",
    "tw:border-b-[length:0]", "tw:[border-bottom-style:none]", "tw:border-b-[color:currentColor]", "tw:border-l-[length:0]",
    "tw:[border-left-style:none]", "tw:border-l-[color:currentColor]", "tw:rounded-[0]", "tw:bg-[color:transparent]",
    "tw:[background-image:none]", "tw:[box-shadow:none]",
  ].join(" "),
} as const;
