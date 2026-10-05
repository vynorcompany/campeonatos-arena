import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "grid_form": sharedUtilities.gridForm,
  "field": sharedUtilities.field,
  "field_form_full": sharedUtilities.fieldFormFull,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "simple_list": sharedUtilities.simpleList,
  "simple_item": sharedUtilities.simpleItem,
  "plan_owner_tags": [
    "plan-owner-tags", "tw:flex", "tw:flex-wrap", "tw:gap-y-[4px]",
    "tw:gap-x-[4px]",
  ].join(" "),
  "plan_owner_tag": [
    "plan-owner-tag", "tw:w-[fit-content]", "tw:pt-[3px]", "tw:pr-[6px]",
    "tw:pb-[3px]", "tw:pl-[6px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#cbdcf0]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#cbdcf0]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#cbdcf0]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#cbdcf0]", "tw:rounded-[999px]", "tw:bg-[color:#eef5ff]",
    "tw:[background-image:none]", "tw:text-[color:#28598d]!", "tw:text-[.66rem]!", "tw:not-italic",
    "tw:font-[800]",
  ].join(" "),
  "muted": sharedUtilities.muted,
} as const;
