/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "whatsapp_page": [
    "whatsapp-page", "tw:min-h-[calc(100vh_-_48px)]", "tw:[@media(min-width:721px)]:min-h-[0]", "tw:block",
    "tw:gap-y-[0]", "tw:gap-x-[0]", "tw:[&_>_.whatsapp-inbox]:h-[calc(100vh_-_48px)]", "tw:viewport-720:[&_>_.whatsapp-inbox]:h-[auto]",
    "tw:[@media(min-width:721px)]:[&_>_.whatsapp-inbox]:h-[100%]", "tw:[&_>_.whatsapp-inbox]:min-h-[0]", "tw:viewport-720:[&_>_.whatsapp-inbox]:min-h-[max(720px,_calc(100svh_-_32px))]", "tw:[@media(min-width:721px)]:[&_>_.whatsapp-inbox]:min-h-[0]",
    "tw:[@media(min-width:721px)]:h-[100%]", "tw:[@media(min-width:721px)]:pt-[16px]", "tw:[@media(min-width:721px)]:pr-[16px]", "tw:[@media(min-width:721px)]:pb-[16px]",
    "tw:[@media(min-width:721px)]:pl-[16px]", "tw:[@media(min-width:721px)]:[overflow-x:hidden]", "tw:[@media(min-width:721px)]:[overflow-y:hidden]", "tw:[@media(min-width:721px)]:[box-sizing:border-box]",
    "tw:[@media(min-width:721px)]:[html:has(&)]:h-[100%]", "tw:[@media(min-width:721px)]:[html:has(&)]:[overflow-x:hidden]", "tw:[@media(min-width:721px)]:[html:has(&)]:[overflow-y:hidden]", "tw:[@media(min-width:721px)]:[body:has(&)]:h-[100%]",
    "tw:[@media(min-width:721px)]:[body:has(&)]:[overflow-x:hidden]", "tw:[@media(min-width:721px)]:[body:has(&)]:[overflow-y:hidden]",
  ].join(" "),
} as const;
