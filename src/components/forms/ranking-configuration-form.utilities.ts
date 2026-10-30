import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities as shared } from "@/components/ui/shared.utilities";
export const viewStyles = {
 stack_md: ui.page,
 grid_form_section_card_ranking_configuration_form: ui.panel + " tw:grid tw:grid-cols-2 tw:gap-3 tw:viewport-680:grid-cols-1",
 form_full_ranking_configuration_heading: "tw:sr-only",
 muted: shared.muted, field: ui.field, field_form_full: ui.field,
 ranking_general_options_form_full: "tw:col-span-full tw:grid tw:grid-cols-2 tw:gap-3 tw:border-y tw:border-[var(--line)] tw:py-3 tw:viewport-680:grid-cols-1",
 ranking_general_control: "ranking-general-control tw:flex tw:min-w-0 tw:items-start tw:gap-2 tw:text-xs tw:cursor-pointer tw:[&_input]:mt-0.5 tw:[&_input]:w-[18px] tw:[&_input]:h-[18px] tw:[&_input]:shrink-0 tw:[&:has(input:disabled)]:opacity-60",
 ranking_general_control_copy: "ranking-general-control-copy tw:grid tw:min-w-0 tw:gap-1 tw:[&_strong]:font-medium! tw:[&_small]:text-[11px] tw:[&_small]:text-[var(--muted)]",
 muted_form_full: "tw:col-span-full tw:m-0 tw:text-[11px] tw:text-[var(--muted)]",
 form_error_form_full: shared.formErrorFormFull, form_success_form_full: shared.formSuccessFormFull,
 section_actions_form_full: "tw:col-span-full tw:flex tw:justify-end tw:gap-2",
 button_button_primary: ui.primary,
 section_card: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-[var(--line)] tw:pt-3 tw:[&_h3]:sr-only tw:[&_p]:m-0 tw:[&_p]:text-xs",
 section_actions: "tw:flex tw:flex-wrap tw:gap-2",
 button_button_danger: shared.buttonButtonDangerButtonSmall,
} as const;
