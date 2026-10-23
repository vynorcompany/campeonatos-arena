import { sharedUtilities as shared } from "@/components/ui/shared.utilities";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export const viewStyles = {
 sponsorship_dialog_backdrop: shared.commandModalBackdrop,
 sponsorship_dialog: "tw:grid tw:max-w-[640px] tw:gap-3",
 button_button_small: ui.secondary,
 button_button_primary: ui.primary,
 grid_form_sponsorship_dialog_form: "sponsorship-dialog-form tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:viewport-620:grid-cols-1 tw:[&_input:not([type=file])]:h-9! tw:[&_input]:min-w-0 tw:[&_input]:rounded-md! tw:[&_select]:h-9! tw:[&_select]:rounded-md! tw:[&_label]:text-xs! tw:[&_input]:text-[13px]! tw:[&_select]:text-[13px]!",
 field: ui.field,
 sponsor_benefit_options_form_full: "tw:col-span-full tw:grid tw:grid-cols-2 tw:gap-3 tw:border-0 tw:p-0 tw:[&_legend]:mb-2 tw:[&_legend]:text-xs tw:[&_label]:grid tw:[&_label]:gap-1",
 sponsorship_dialog_actions_form_full: "tw:col-span-full tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3",
 button: ui.secondary,
 button_button_primary_button_small: ui.primary,
 field_form_full: ui.field + " tw:col-span-full",
 field_form_full_sponsor_client_search: ui.field + " tw:relative tw:col-span-full",
 sponsor_client_options: "tw:relative tw:z-10 tw:grid tw:max-h-40 tw:overflow-y-auto tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:[&_button]:grid tw:[&_button]:gap-0.5 tw:[&_button]:border-0 tw:[&_button]:border-b tw:[&_button]:border-[var(--line)] tw:[&_button]:bg-white tw:[&_button]:p-2 tw:[&_button]:text-left tw:[&_button]:text-xs tw:[&_small]:text-[11px] tw:[&_small]:text-[var(--muted)]",
} as const;
