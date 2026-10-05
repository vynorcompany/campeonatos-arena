import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "client_management_page": [
    "client-management-page", "tw:w-[min(100%,_1420px)]", "tw:pt-[4px]", "tw:pr-[0]",
    "tw:pb-[30px]", "tw:pl-[0]",
  ].join(" "),
  "client_management_header": [
    "client-management-header", "tw:flex", "tw:justify-between", "tw:gap-y-[20px]",
    "tw:gap-x-[20px]", "tw:items-start", "tw:viewport-620:items-stretch", "tw:pt-[10px]",
    "tw:pr-[0]", "tw:pb-[18px]", "tw:pl-[0]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dbe5ef]", "tw:[&_h1]:mt-[3px]", "tw:[&_h1]:mr-[0]",
    "tw:[&_h1]:mb-[3px]", "tw:[&_h1]:ml-[0]", "tw:[&_h1]:text-[color:#102d54]", "tw:[&_h1]:text-[1.55rem]",
    "tw:[&_p:not(.eyebrow)]:mt-[0]", "tw:[&_p:not(.eyebrow)]:mr-[0]", "tw:[&_p:not(.eyebrow)]:mb-[0]", "tw:[&_p:not(.eyebrow)]:ml-[0]",
    "tw:[&_p:not(.eyebrow)]:text-[color:#61748d]", "tw:[&_p:not(.eyebrow)]:text-[.82rem]", "tw:viewport-620:flex-col",
  ].join(" "),
  "page_breadcrumb": sharedUtilities.pageBreadcrumb,
} as const;
