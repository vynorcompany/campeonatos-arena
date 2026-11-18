/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "online_charge_icons": [
    "online-charge-icons", "tw:inline-flex", "tw:items-center", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]", "tw:mt-[7px]", "tw:[vertical-align:middle]",
  ].join(" "),
  "online_charge_icon": [
    "online-charge-icon", "online-charge-icon-boleto", "tw:relative", "tw:[display:inline-grid]",
    "tw:w-[16px]", "tw:h-[16px]", "tw:place-items-center", "tw:text-[color:#137148]",
    "tw:[cursor:help]", "tw:focus-visible:outline-2", "tw:focus-visible:outline-offset-2", "tw:focus-visible:outline-[#174983]", "tw:[&_>_svg]:w-[16px]", "tw:[&_>_svg]:h-[16px]",
    "tw:[&_>_svg]:[fill:none]", "tw:[&_>_svg]:[stroke:currentColor]", "tw:[&_>_svg]:[stroke-linecap:round]", "tw:[&_>_svg]:[stroke-linejoin:round]",
    "tw:[&_>_svg]:[stroke-width:1.8]",
  ].join(" "),
  "online_charge_icon_online_charge_icon_viewed": [
    "online-charge-icon", "online-charge-icon-viewed", "tw:relative", "tw:[display:inline-grid]",
    "tw:w-[16px]", "tw:h-[16px]", "tw:place-items-center", "tw:text-[color:#17699a]",
    "tw:[cursor:help]", "tw:focus-visible:outline-2", "tw:focus-visible:outline-offset-2", "tw:focus-visible:outline-[#174983]", "tw:[&_>_svg]:w-[16px]", "tw:[&_>_svg]:h-[16px]",
    "tw:[&_>_svg]:[fill:none]", "tw:[&_>_svg]:[stroke:currentColor]", "tw:[&_>_svg]:[stroke-linecap:round]", "tw:[&_>_svg]:[stroke-linejoin:round]",
    "tw:[&_>_svg]:[stroke-width:1.8]",
  ].join(" "),
  "online_charge_status_online_charge_pending": [
    "online-charge-status", "online-charge-pending", "tw:block", "tw:mt-[2px]",
    "tw:text-[.65rem]", "tw:font-normal", "tw:text-[color:#a35a00]",
  ].join(" "),
} as const;
