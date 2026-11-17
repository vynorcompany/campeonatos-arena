import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
export const viewStyles = {
 tournament_editor_form: "tournament-editor-form tw:grid tw:w-full tw:min-w-0 tw:max-w-none tw:gap-4",
 tournament_editor_grid: "tournament-editor-grid tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:viewport-720:grid-cols-1 tw:[&_textarea]:min-h-[72px] tw:[&_textarea]:resize-y",
 field: ui.field,
 field_form_full: `${ui.field} tw:col-span-full`,
 field_form_full_tournament_public_slug: `${ui.field} tw:col-span-full tw:[&>div]:flex tw:[&>div]:min-w-0 tw:[&>div]:items-center tw:[&>div]:gap-2 tw:[&>div>input]:min-w-0 tw:[&>div>input]:flex-1 tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:text-[#465c75]`,
 tournament_radar_setting_form_full: "tw:col-span-full tw:flex tw:min-w-0 tw:items-start tw:gap-2 tw:text-xs tw:[&_input]:mt-0.5 tw:[&_input]:shrink-0 tw:[&_strong]:font-medium tw:[&_p]:m-0 tw:[&_p]:mt-1 tw:[&_p]:text-[#465c75]",
 tournament_editor_footer: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-[#c7d8eb] tw:pt-3 tw:text-xs tw:[&_p]:m-0 tw:[&_p]:text-[#465c75]",
 button_button_primary: ui.success,
 form_error_form_full: sharedUtilities.formError,
 form_success_form_full: sharedUtilities.formSuccess,
} as const;
