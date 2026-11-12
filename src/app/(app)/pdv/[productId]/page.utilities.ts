import { managementControls } from "@/components/ui/management-controls";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export const viewStyles = {
  product_management_stack_md:
    ui.page +
    " tw:[&_section]:p-3! tw:[&_h2]:text-sm! tw:[&_h2]:font-medium! tw:[&_label]:leading-5!",
  button: (ui.secondary) + " " + managementControls.secondary,
  grid_form:
    "tw:grid tw:min-w-0 tw:items-start tw:grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] tw:gap-3",
  field: ui.field,
  button_button_primary: (ui.primary) + " " + managementControls.primary,
} as const;
