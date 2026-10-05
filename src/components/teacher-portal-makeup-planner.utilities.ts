import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "teacher_makeup_planner": [
    "teacher-makeup-planner", "tw:grid", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
    "tw:[&_>_header]:grid", "tw:[&_>_header]:gap-y-[3px]", "tw:[&_>_header]:gap-x-[3px]", "tw:[&_h3]:mt-[0]",
    "tw:[&_h3]:mr-[0]", "tw:[&_h3]:mb-[0]", "tw:[&_h3]:ml-[0]", "tw:[&_h3]:text-[color:#edfafa]",
    "tw:[&_h3]:text-[.95rem]", "tw:[&_p]:mt-[0]", "tw:[&_p]:mr-[0]", "tw:[&_p]:mb-[0]",
    "tw:[&_p]:ml-[0]", "tw:[&_p]:text-[color:#abc9d2]", "tw:[&_p]:text-[.73rem]", "tw:[&_>_header_>_span]:text-[color:#58e5bd]",
    "tw:[&_>_header_>_span]:text-[.67rem]", "tw:[&_>_header_>_span]:font-[800]", "tw:[&_>_header_>_span]:tracking-[.08em]",
  ].join(" "),
  "teacher_makeup_form": [
    "teacher-makeup-form", "tw:[&_>_footer]:flex", "tw:[&_>_footer]:items-center", "tw:[&_>_footer]:justify-between",
    "tw:[&_>_footer]:gap-y-[8px]", "tw:[&_>_footer]:gap-x-[8px]", "tw:[&_>_footer_small]:text-[color:#a6c5cf]", "tw:[&_>_footer_small]:text-[.66rem]",
    "tw:grid", "tw:gap-y-[9px]", "tw:gap-x-[9px]",
  ].join(" "),
  "teacher_makeup_students": [
    "teacher-makeup-students", "tw:grid", "tw:gap-y-[5px]", "tw:gap-x-[5px]",
    "tw:[&_label]:flex", "tw:[&_label]:items-center", "tw:[&_label]:gap-y-[8px]", "tw:[&_label]:gap-x-[8px]",
    "tw:[&_label]:pt-[8px]", "tw:[&_label]:pr-[8px]", "tw:[&_label]:pb-[8px]", "tw:[&_label]:pl-[8px]",
    "tw:[&_label]:border-t-[length:1px]", "tw:[&_label]:[border-top-style:solid]", "tw:[&_label]:border-t-[color:rgb(105_181_198_/_.24)]", "tw:[&_label]:border-r-[length:1px]",
    "tw:[&_label]:[border-right-style:solid]", "tw:[&_label]:border-r-[color:rgb(105_181_198_/_.24)]", "tw:[&_label]:border-b-[length:1px]", "tw:[&_label]:[border-bottom-style:solid]",
    "tw:[&_label]:border-b-[color:rgb(105_181_198_/_.24)]", "tw:[&_label]:border-l-[length:1px]", "tw:[&_label]:[border-left-style:solid]", "tw:[&_label]:border-l-[color:rgb(105_181_198_/_.24)]",
    "tw:[&_label]:rounded-[7px]", "tw:[&_label]:cursor-pointer", "tw:[&_input[type=checkbox]]:w-[15px]", "tw:[&_input[type=checkbox]]:h-[15px]",
    "tw:[&_input[type=checkbox]]:[accent-color:#4ce1b8]", "tw:[&_span]:grid", "tw:[&_span]:gap-y-[2px]", "tw:[&_span]:gap-x-[2px]",
    "tw:[&_strong]:text-[color:#eaf9fb]", "tw:[&_strong]:text-[.74rem]", "tw:[&_small]:text-[color:#abc8d0]", "tw:[&_small]:text-[.66rem]",
  ].join(" "),
  "teacher_makeup_slot": [
    "teacher-makeup-slot", "tw:grid", "tw:gap-y-[4px]", "tw:gap-x-[4px]",
    "tw:text-[color:#c2dbe1]", "tw:text-[.68rem]", "tw:[&_select]:min-h-[34px]", "tw:[&_select]:pt-[6px]",
    "tw:[&_select]:pr-[8px]", "tw:[&_select]:pb-[6px]", "tw:[&_select]:pl-[8px]", "tw:[&_select]:border-t-[length:1px]",
    "tw:[&_select]:[border-top-style:solid]", "tw:[&_select]:border-t-[color:#5eabbc]", "tw:[&_select]:border-r-[length:1px]", "tw:[&_select]:[border-right-style:solid]",
    "tw:[&_select]:border-r-[color:#5eabbc]", "tw:[&_select]:border-b-[length:1px]", "tw:[&_select]:[border-bottom-style:solid]", "tw:[&_select]:border-b-[color:#5eabbc]",
    "tw:[&_select]:border-l-[length:1px]", "tw:[&_select]:[border-left-style:solid]", "tw:[&_select]:border-l-[color:#5eabbc]", "tw:[&_select]:rounded-[7px]",
    "tw:[&_select]:text-[color:#f2fbfc]", "tw:[&_select]:bg-[color:#082f42]", "tw:[&_select]:[background-image:none]", "tw:[&_select]:text-[.74rem]",
  ].join(" "),
  "button_button_primary_button_small": sharedUtilities.buttonButtonPrimaryButtonSmall,
  "teacher_portal_empty_filter": [
    "teacher-portal-empty-filter", "tw:mt-[0]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:pt-[14px]", "tw:pr-[14px]", "tw:pb-[14px]",
    "tw:pl-[14px]", "tw:border-t-[length:1px]", "tw:[border-top-style:dashed]", "tw:border-t-[color:rgb(106_184_200_/_.35)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:dashed]", "tw:border-r-[color:rgb(106_184_200_/_.35)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:dashed]", "tw:border-b-[color:rgb(106_184_200_/_.35)]", "tw:border-l-[length:1px]", "tw:[border-left-style:dashed]",
    "tw:border-l-[color:rgb(106_184_200_/_.35)]", "tw:rounded-[8px]", "tw:text-[color:#b6d1d8]", "tw:text-center",
  ].join(" "),
} as const;
