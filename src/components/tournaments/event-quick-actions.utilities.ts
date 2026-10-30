import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export const viewStyles = {
  event_quick_actions: "event-quick-actions tw:grid tw:min-w-0 tw:gap-2 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-4 tw:[&>header]:flex tw:[&>header]:items-center tw:[&>header]:gap-2 tw:[&>header]:pb-2 tw:[&_h2]:m-0 tw:[&_h2]:text-sm tw:[&_h2]:font-semibold tw:[&>header]:text-[#174983]",
  event_quick_action_button: "tw:grid tw:w-full tw:min-w-0 tw:grid-cols-[32px_minmax(0,1fr)_16px] tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:p-2 tw:text-left tw:text-[#174983] tw:no-underline tw:hover:border-[#1e5ea8] tw:[&_strong]:text-xs tw:[&_strong]:font-semibold",
  event_quick_action_icon: "event-quick-action-icon tw:grid tw:size-8 tw:place-items-center tw:rounded-md tw:bg-[#174983] tw:text-white",
  event_action_public_page: "tw:grid tw:justify-items-start tw:gap-3",
  button_button_primary: ui.primary,
} as const;
