import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "tournament_management_page_stack_md": sharedUtilities.tournamentManagementPageStackMd,
  "page_header_tournament_management_header": sharedUtilities.pageHeaderTournamentManagementHeader,
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "button": sharedUtilities.button,
  "section_card": sharedUtilities.sectionCard2,
  "grid_form": sharedUtilities.gridForm,
  "field_form_full": sharedUtilities.fieldFormFull,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
