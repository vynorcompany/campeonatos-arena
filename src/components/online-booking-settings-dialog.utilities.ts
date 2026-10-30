import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "agenda_online_settings_trigger": sharedUtilities.buttonButtonPrimaryButtonSmall + " tw:min-w-9 tw:px-2",
  "button_button_small": sharedUtilities.buttonButtonSmall,
  "online_booking_link": "online-booking-link tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-y tw:border-[var(--line)] tw:py-3 tw:[&>div]:min-w-0 tw:[&_strong]:block tw:[&_strong]:text-xs tw:[&_code]:block tw:[&_code]:break-all tw:[&_code]:text-[11px] tw:[&_code]:text-[var(--muted)]",
  "online_booking_settings_form": "online-booking-settings-form tw:grid tw:grid-cols-[minmax(130px,180px)_minmax(180px,220px)] tw:items-start tw:gap-3 tw:viewport-620:grid-cols-1 tw:[&_label]:text-xs tw:[&_small]:text-[11px] tw:[&_textarea]:min-h-[80px] tw:[&_textarea]:p-2 tw:[&_textarea]:text-xs",
  "field": sharedUtilities.field,
  "online_booking_settings_toggles_form_full": "online-booking-settings-toggles form-full tw:col-span-full tw:grid tw:items-start tw:grid-cols-2 tw:gap-x-4 tw:gap-y-3 tw:border-y tw:border-[var(--line)] tw:py-3 tw:viewport-440:grid-cols-1",
  "control_toggle": sharedUtilities.controlToggle,
  "field_form_full": sharedUtilities.fieldFormFull,
  "online_booking_settings_footer_form_full": [
    "online-booking-settings-footer", "form-full", "tw:flex", "tw:justify-between",
    "tw:items-center", "tw:viewport-680:items-stretch", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
    "tw:[grid-column:1_/_-1]", "tw:pt-[4px]", "tw:[&_.button]:[text-decoration:none]", "tw:viewport-680:flex-col",
    "tw:viewport-680:[&_.button]:w-[100%]", "tw:viewport-680:[&_.button]:justify-center",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
