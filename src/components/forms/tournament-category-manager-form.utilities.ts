import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
export const viewStyles = {
 field_tournament_category_add_field: `${ui.field} tw:max-w-[560px] tw:[&_.field-inline]:flex tw:[&_.field-inline]:gap-2 tw:[&_input]:min-w-0 tw:[&_input]:flex-1`,
 tournament_category_manager_list: "tw:grid tw:min-w-0 tw:gap-4",
 tournament_category_manager_card: "tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[#c7d8eb] tw:bg-white tw:p-3 tw:[&_.tournament-category-settings-grid]:grid tw:[&_.tournament-category-settings-grid]:grid-cols-3 tw:[&_.tournament-category-settings-grid]:gap-3 tw:viewport-760:[&_.tournament-category-settings-grid]:grid-cols-2 tw:viewport-460:[&_.tournament-category-settings-grid]:grid-cols-1",
 tournament_category_manager_card_header: "tw:-mx-3 tw:-mt-3 tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:rounded-t-[5px] tw:bg-[#174983] tw:px-3 tw:py-2.5 tw:text-white tw:[&>div]:grid tw:[&>div]:gap-1 tw:[&_strong]:text-sm tw:[&_strong]:font-semibold tw:[&_span]:text-xs",
 tournament_category_standard: ui.field,
 tournament_category_link_toggle: "tw:flex tw:min-w-0 tw:items-center tw:gap-2 tw:text-xs tw:[&_input]:shrink-0",
 tournament_category_link_options: "tw:flex tw:min-w-0 tw:flex-wrap tw:gap-3 tw:text-xs tw:[&_label]:flex tw:[&_label]:items-center tw:[&_label]:gap-2",
 currency_input: "tw:flex tw:min-w-0 tw:items-center tw:gap-2 tw:[&_input]:min-w-0 tw:[&_input]:w-full",
 section_actions: "tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[#c7d8eb] tw:pt-3",
 button: ui.primary, button_button_primary: ui.success, button_button_small: ui.danger,
 muted: "tw:m-0 tw:text-xs tw:text-[#465c75]", form_error: sharedUtilities.formError, form_success: sharedUtilities.formSuccess,
} as const;
