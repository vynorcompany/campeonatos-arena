import { managementControls } from "@/components/ui/management-controls";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export const viewStyles = {
  event_quick_actions: "event-quick-actions tw:grid tw:min-w-0 tw:gap-0.5 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:[&>header]:flex tw:[&>header]:items-center tw:[&>header]:gap-2 tw:[&>header]:pb-2 tw:[&_h2]:m-0 tw:[&_h2]:text-sm tw:[&_h2]:font-medium tw:[&>header]:text-[#174983]",
  event_quick_action_button: "tw:grid tw:w-full tw:min-w-0 tw:grid-cols-[18px_minmax(0,1fr)_14px] tw:items-center tw:gap-2 tw:rounded tw:border-0 tw:border-b tw:border-[#e3ebf4] tw:bg-transparent tw:px-1 tw:py-2.5 tw:text-left tw:text-[#174983] tw:no-underline tw:hover:bg-[#e8f1fc] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:[&_strong]:text-xs tw:[&_strong]:font-medium",
  event_quick_action_icon: "event-quick-action-icon tw:grid tw:size-[18px] tw:place-items-center tw:text-[#215da5]",
  event_action_public_page: "tw:grid tw:justify-items-start tw:gap-3",
  button_button_primary: (ui.primary) + " " + managementControls.primary,
} as const;
