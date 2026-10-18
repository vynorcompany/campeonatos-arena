import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "public_reg_success_page": [
    "public-reg-success-page", "tw:min-h-[100vh]", "tw:grid", "tw:place-items-center",
    "tw:pt-[24px]", "tw:pr-[24px]", "tw:pb-[24px]", "tw:pl-[24px]",
    "tw:bg-[color:#031f2b]", "tw:[background-image:none]",
  ].join(" "),
  "public_reg_success_card": [
    "public-reg-success-card", "tw:w-[min(100%,_680px)]", "tw:pt-[clamp(28px,_5vw,_52px)]", "tw:pr-[clamp(28px,_5vw,_52px)]",
    "tw:pb-[clamp(28px,_5vw,_52px)]", "tw:pl-[clamp(28px,_5vw,_52px)]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#2b687f]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#2b687f]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#2b687f]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#2b687f]", "tw:rounded-[20px]", "tw:text-[color:#edf9ff]",
    "tw:bg-[color:rgba(6,_41,_56,_.92)]", "tw:[background-image:none]", "tw:[box-shadow:0_30px_80px_rgba(0,_0,_0,_.3)]", "tw:[&_h1]:mt-[8px]",
    "tw:[&_h1]:mr-[0]", "tw:[&_h1]:mb-[10px]", "tw:[&_h1]:ml-[0]", "tw:[&_h1]:text-[color:#fff]",
    "tw:[&_>_p:not(.eyebrow)]:text-[color:#b9d7e5]", "tw:[&_>_.button]:mt-[0]", "tw:[&_>_.button]:mr-[8px]", "tw:[&_>_.button]:mb-[8px]",
    "tw:[&_>_.button]:ml-[0]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "public_reg_success_summary": [
    "public-reg-success-summary", "tw:grid", "tw:grid-cols-[repeat(2,_minmax(0,_1fr))]", "tw:viewport-760:grid-cols-[1fr]",
    "tw:gap-y-[1px]", "tw:gap-x-[1px]", "tw:mt-[28px]", "tw:mr-[0]",
    "tw:mb-[28px]", "tw:ml-[0]", "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#2f6e83]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:#2f6e83]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:#2f6e83]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:#2f6e83]",
    "tw:rounded-[12px]", "tw:bg-[color:#2f6e83]", "tw:[background-image:none]", "tw:[&_div]:grid",
    "tw:[&_div]:gap-y-[5px]", "tw:[&_div]:gap-x-[5px]", "tw:[&_div]:pt-[15px]", "tw:[&_div]:pr-[15px]",
    "tw:[&_div]:pb-[15px]", "tw:[&_div]:pl-[15px]", "tw:[&_div]:bg-[color:rgba(7,_48,_64,_.97)]", "tw:[&_div]:[background-image:none]",
    "tw:[&_span]:text-[color:#9fc2d1]", "tw:[&_span]:text-[.78rem]", "tw:[&_strong]:text-[color:#fff]",
    "tw:[&>div:last-child:nth-child(odd)]:col-span-2", "tw:viewport-760:[&>div:last-child:nth-child(odd)]:col-span-1",
    "tw:[&_strong.status-confirmed]:text-[#087a46]", "tw:[&_strong.status-pending]:text-[#996200]", "tw:[&_strong.status-expired]:text-[#a3261d]",
  ].join(" "),
  "status_confirmed": [
    "status-confirmed", "tw:inline-flex", "tw:w-[fit-content]", "tw:pt-[5px]",
    "tw:pr-[9px]", "tw:pb-[5px]", "tw:pl-[9px]", "tw:rounded-[999px]",
    "tw:text-[.78rem]", "tw:font-[800]", "tw:text-[color:#087a46]", "tw:bg-[color:#e4f8ee]",
    "tw:[background-image:none]",
  ].join(" "),
  "status_pending": [
    "status-pending", "tw:inline-flex", "tw:w-[fit-content]", "tw:pt-[5px]",
    "tw:pr-[9px]", "tw:pb-[5px]", "tw:pl-[9px]", "tw:rounded-[999px]",
    "tw:text-[.78rem]", "tw:font-[800]", "tw:text-[color:#996200]", "tw:bg-[color:#fff3db]",
    "tw:[background-image:none]",
  ].join(" "),
  "status_expired": [
    "status-expired", "tw:inline-flex", "tw:w-fit", "tw:rounded-full", "tw:px-[9px]", "tw:py-[5px]",
    "tw:text-[.78rem]", "tw:font-extrabold", "tw:text-[#a3261d]", "tw:bg-[#ffebe9]",
  ].join(" "),
  "pix_payment": [
    "tw:w-full", "tw:grid", "tw:justify-items-start", "tw:gap-[12px]", "tw:rounded-[12px]",
    "tw:border", "tw:border-[#2f6e83]", "tw:bg-[#073040]", "tw:p-[16px]",
    "tw:[&_img]:w-[min(100%,_200px)]", "tw:[&_img]:rounded-[8px]",
    "tw:[&_div]:grid", "tw:[&_div]:min-w-0", "tw:[&_div]:gap-[6px]",
    "tw:[&_span]:text-[.78rem]", "tw:[&_span]:text-[#9fc2d1]",
    "tw:[&_code]:max-w-full", "tw:[&_code]:break-all", "tw:[&_code]:text-[.8rem]", "tw:[&_code]:text-white",
    "tw:[&_small]:text-[.8rem]", "tw:[&_small]:text-[#9ce8c9]",
  ].join(" "),
  "payment_controls": [
    "tw:grid", "tw:justify-items-start", "tw:gap-[14px]", "tw:mb-[20px]",
  ].join(" "),
  "payment_deadline": [
    "tw:m-0", "tw:text-[.88rem]", "tw:font-semibold", "tw:text-[#b9d7e5]",
  ].join(" "),
  "payment_copy_button": [
    "tw:mt-[4px]", "tw:w-fit", "tw:rounded-[8px]", "tw:border", "tw:border-[#63d7b2]",
    "tw:bg-[#0c604f]", "tw:px-[12px]", "tw:py-[7px]", "tw:text-[.84rem]", "tw:font-semibold", "tw:text-white",
  ].join(" "),
  "payment_refresh_button": [
    "tw:rounded-[8px]", "tw:border", "tw:border-[#73a7bd]", "tw:bg-transparent",
    "tw:px-[13px]", "tw:py-[9px]", "tw:text-[.88rem]", "tw:font-semibold", "tw:text-[#c8e9f5]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "button": sharedUtilities.button,
} as const;
