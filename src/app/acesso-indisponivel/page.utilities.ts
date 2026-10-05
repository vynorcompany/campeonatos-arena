import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "access_unavailable_page": [
    "access-unavailable-page", "tw:min-h-[100dvh]", "tw:grid", "tw:place-items-center",
    "tw:pt-[24px]", "tw:pr-[24px]", "tw:pb-[24px]", "tw:pl-[24px]",
    "tw:bg-[color:#f1f5fa]", "tw:[background-image:none]",
  ].join(" "),
  "access_unavailable_card": [
    "access-unavailable-card", "tw:flex", "tw:flex-wrap", "tw:gap-y-[16px]",
    "tw:gap-x-[16px]", "tw:max-w-[560px]", "tw:pt-[34px]", "tw:pr-[34px]",
    "tw:pb-[34px]", "tw:pl-[34px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#d4e1f2]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#d4e1f2]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#d4e1f2]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#d4e1f2]", "tw:rounded-[16px]", "tw:bg-[color:#fff]",
    "tw:[background-image:none]", "tw:[box-shadow:0_20px_50px_#18396416]", "tw:[&_h1]:[flex-basis:100%]", "tw:[&_h1]:mt-[0]",
    "tw:[&_h1]:mr-[0]", "tw:[&_h1]:mb-[0]", "tw:[&_h1]:ml-[0]", "tw:[&_p]:[flex-basis:100%]",
    "tw:[&_p]:mt-[0]", "tw:[&_p]:mr-[0]", "tw:[&_p]:mb-[0]", "tw:[&_p]:ml-[0]",
    "tw:[&_.eyebrow]:[flex-basis:100%]", "tw:[&_.eyebrow]:mt-[0]", "tw:[&_.eyebrow]:mr-[0]", "tw:[&_.eyebrow]:mb-[0]",
    "tw:[&_.eyebrow]:ml-[0]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "button": sharedUtilities.button,
} as const;
