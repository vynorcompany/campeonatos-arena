import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": ui.page,
  "page_header": sharedUtilities.pageHeader,
  "button_button_primary": ui.primary,
} as const;
