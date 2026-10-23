import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "agenda_online_settings_trigger": [
    "agenda-online-settings-trigger", "tw:grid", "tw:place-items-center", "tw:min-w-[38px]",
    "tw:pt-[0]", "tw:pr-[9px]", "tw:pb-[0]", "tw:pl-[9px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#0d4f88]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:#0d4f88]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:#0d4f88]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:#0d4f88]",
    "tw:rounded-[var(--radius-control)]", "tw:bg-[color:transparent]", "tw:[background-image:linear-gradient(145deg,_#1684c5,_#0d5c9c)]", "tw:text-[color:#fff]",
    "tw:text-[1.12rem]", "tw:[box-shadow:0_3px_8px_rgb(13_79_136_/_.25)]", "tw:cursor-pointer", "tw:[transition:transform_160ms_var(--ease-standard),_background_160ms_var(--ease-standard)]",
    "tw:hover:bg-[color:transparent]", "tw:hover:[background-image:linear-gradient(145deg,_#0f6fad,_#08477c)]", "tw:hover:[transform:translateY(-1px)]",
  ].join(" "),
  "command_modal_backdrop": sharedUtilities.commandModalBackdrop,
  "online_booking_settings_modal": "online-booking-settings-modal tw:grid tw:w-full tw:max-w-[600px] tw:gap-4 tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-white tw:p-5 tw:shadow-xl tw:viewport-440:p-3 tw:[&>header]:flex tw:[&>header]:items-start tw:[&>header]:justify-between tw:[&>header]:gap-3 tw:[&_h2]:m-0 tw:[&_h2]:text-base tw:[&_header_span]:text-[10px] tw:[&_header_span]:font-semibold tw:[&_header_span]:text-[var(--muted)]",
  "button_button_small": sharedUtilities.buttonButtonSmall,
  "online_booking_link": "online-booking-link tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-y tw:border-[var(--line)] tw:py-3 tw:[&>div]:min-w-0 tw:[&_strong]:block tw:[&_strong]:text-xs tw:[&_code]:block tw:[&_code]:break-all tw:[&_code]:text-[11px] tw:[&_code]:text-[var(--muted)]",
  "online_booking_settings_form": "online-booking-settings-form tw:grid tw:grid-cols-[minmax(130px,180px)_minmax(180px,220px)] tw:items-start tw:gap-3 tw:viewport-620:grid-cols-1 tw:[&_label]:text-xs tw:[&_small]:text-[11px] tw:[&_textarea]:min-h-[80px] tw:[&_textarea]:p-2 tw:[&_textarea]:text-xs",
  "field": sharedUtilities.field,
  "online_booking_settings_toggles_form_full": "online-booking-settings-toggles form-full tw:col-span-full tw:grid tw:grid-cols-2 tw:gap-x-4 tw:gap-y-3 tw:border-y tw:border-[var(--line)] tw:py-3 tw:viewport-440:grid-cols-1",
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
