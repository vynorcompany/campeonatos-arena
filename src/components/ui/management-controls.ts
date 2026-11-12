/** Compact controls for management screens; keep secondary actions distinct from inputs. */
const control = "tw:min-h-8! tw:w-fit! tw:max-w-full tw:items-center tw:justify-center tw:gap-1.5! tw:rounded! tw:px-2.5! tw:py-1! tw:text-xs! tw:font-normal! tw:leading-normal! tw:shadow-none! tw:[background-image:none]! tw:transition-colors tw:hover:translate-y-0! tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:[&_svg]:size-4 tw:[&_svg]:shrink-0";
export const managementControls = {
 primary: control + " tw:border-[#215da5]! tw:bg-[#215da5]! tw:text-white! tw:hover:border-[#174983]! tw:hover:bg-[#174983]! tw:focus-visible:outline-[#215da5]",
 secondary: control + " tw:border-[#adc8e8]! tw:bg-[#e8f1fc]! tw:text-[#174983]! tw:hover:border-[#739dcc]! tw:hover:bg-[#d4e6fa]! tw:focus-visible:outline-[#215da5]",
 success: control + " tw:border-[#087443]! tw:bg-[#087443]! tw:text-white! tw:hover:bg-[#065b35]! tw:focus-visible:outline-[#087443]",
 danger: control + " tw:border-[#e4aaa5]! tw:bg-[#fff0ee]! tw:text-[#a02119]! tw:hover:bg-[#ffdbd6]! tw:focus-visible:outline-[#a02119]",
 neutral: control + " tw:border-[#c9d4e1]! tw:bg-[#edf1f6]! tw:text-[#344b65]! tw:hover:bg-[#dfe6ef]! tw:focus-visible:outline-[#526781]",
 filters: "tw:min-w-0 tw:gap-2! tw:[&_label]:font-normal! tw:[&_label]:text-xs! tw:[&_input:not([type=checkbox]):not([type=radio]):not([type=hidden])]:h-8! tw:[&_input:not([type=checkbox]):not([type=radio]):not([type=hidden])]:min-h-8! tw:[&_input:not([type=checkbox]):not([type=radio])]:text-xs! tw:[&_select]:h-8! tw:[&_select]:min-h-8! tw:[&_select]:text-xs! tw:[&_input]:rounded-md! tw:[&_select]:rounded-md! tw:[&_input]:font-normal! tw:[&_select]:font-normal!",
} as const;
