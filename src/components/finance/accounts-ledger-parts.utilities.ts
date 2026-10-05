/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "online_charge_icons": [
    "online-charge-icons", "tw:inline-flex", "tw:items-center", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]", "tw:mt-[7px]", "tw:[vertical-align:middle]",
  ].join(" "),
  "online_charge_icon": [
    "online-charge-icon", "online-charge-icon-boleto", "tw:relative", "tw:[display:inline-grid]",
    "tw:w-[16px]", "tw:h-[16px]", "tw:place-items-center", "tw:text-[color:#137148]",
    "tw:[cursor:help]", "tw:[outline:none]", "tw:[&_>_svg]:w-[16px]", "tw:[&_>_svg]:h-[16px]",
    "tw:[&_>_svg]:[fill:none]", "tw:[&_>_svg]:[stroke:currentColor]", "tw:[&_>_svg]:[stroke-linecap:round]", "tw:[&_>_svg]:[stroke-linejoin:round]",
    "tw:[&_>_svg]:[stroke-width:1.8]", "tw:[&::after]:absolute", "tw:[&::after]:z-[20]", "tw:[&::after]:bottom-[calc(100%_+_8px)]",
    "tw:[&::after]:left-[50%]", "tw:[&::after]:w-[max-content]", "tw:[&::after]:max-w-[220px]", "tw:[&::after]:pt-[7px]",
    "tw:[&::after]:pr-[9px]", "tw:[&::after]:pb-[7px]", "tw:[&::after]:pl-[9px]", "tw:[&::after]:rounded-[7px]",
    "tw:[&::after]:bg-[color:#142b42]", "tw:[&::after]:[background-image:none]", "tw:[&::after]:text-[color:#fff]", "tw:[&::after]:text-[.7rem]",
    "tw:[&::after]:font-[650]", "tw:[&::after]:leading-[1.35]", "tw:[&::after]:[content:attr(data-tooltip)]", "tw:[&::after]:opacity-[0]",
    "tw:[&::after]:[pointer-events:none]", "tw:[&::after]:[transform:translate(-50%,_3px)]", "tw:[&::after]:[transition:opacity_.15s_ease,_transform_.15s_ease]", "tw:[&:hover::after]:opacity-[1]",
    "tw:[&:hover::after]:[transform:translate(-50%,_0)]", "tw:[&:focus-visible::after]:opacity-[1]", "tw:[&:focus-visible::after]:[transform:translate(-50%,_0)]",
  ].join(" "),
  "online_charge_icon_online_charge_icon_viewed": [
    "online-charge-icon", "online-charge-icon-viewed", "tw:relative", "tw:[display:inline-grid]",
    "tw:w-[16px]", "tw:h-[16px]", "tw:place-items-center", "tw:text-[color:#17699a]",
    "tw:[cursor:help]", "tw:[outline:none]", "tw:[&_>_svg]:w-[16px]", "tw:[&_>_svg]:h-[16px]",
    "tw:[&_>_svg]:[fill:none]", "tw:[&_>_svg]:[stroke:currentColor]", "tw:[&_>_svg]:[stroke-linecap:round]", "tw:[&_>_svg]:[stroke-linejoin:round]",
    "tw:[&_>_svg]:[stroke-width:1.8]", "tw:[&::after]:absolute", "tw:[&::after]:z-[20]", "tw:[&::after]:bottom-[calc(100%_+_8px)]",
    "tw:[&::after]:left-[50%]", "tw:[&::after]:w-[max-content]", "tw:[&::after]:max-w-[220px]", "tw:[&::after]:pt-[7px]",
    "tw:[&::after]:pr-[9px]", "tw:[&::after]:pb-[7px]", "tw:[&::after]:pl-[9px]", "tw:[&::after]:rounded-[7px]",
    "tw:[&::after]:bg-[color:#142b42]", "tw:[&::after]:[background-image:none]", "tw:[&::after]:text-[color:#fff]", "tw:[&::after]:text-[.7rem]",
    "tw:[&::after]:font-[650]", "tw:[&::after]:leading-[1.35]", "tw:[&::after]:[content:attr(data-tooltip)]", "tw:[&::after]:opacity-[0]",
    "tw:[&::after]:[pointer-events:none]", "tw:[&::after]:[transform:translate(-50%,_3px)]", "tw:[&::after]:[transition:opacity_.15s_ease,_transform_.15s_ease]", "tw:[&:hover::after]:opacity-[1]",
    "tw:[&:hover::after]:[transform:translate(-50%,_0)]", "tw:[&:focus-visible::after]:opacity-[1]", "tw:[&:focus-visible::after]:[transform:translate(-50%,_0)]",
  ].join(" "),
  "online_charge_status_online_charge_pending": [
    "online-charge-status", "online-charge-pending", "tw:block", "tw:mt-[5px]",
    "tw:text-[.65rem]", "tw:font-[800]", "tw:text-[color:#a35a00]",
  ].join(" "),
} as const;
