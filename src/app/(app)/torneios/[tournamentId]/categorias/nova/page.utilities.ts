import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "tournament_management_page_stack_md": sharedUtilities.tournamentManagementPageStackMd,
  "page_header_tournament_management_header": sharedUtilities.pageHeaderTournamentManagementHeader,
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "button": ui.secondary,
  "section_card": sharedUtilities.sectionCard2,
  "grid_form": sharedUtilities.gridForm,
  "field_form_full": `${ui.field} tw:col-span-full tw:[&_label]:text-xs!`,
  "button_button_primary": ui.primary,
} as const;
