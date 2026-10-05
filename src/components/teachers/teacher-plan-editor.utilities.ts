import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "teacher_plan_edit_trigger": [
    "teacher-plan-edit-trigger", "tw:inline-flex", "tw:items-center", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]", "tw:min-h-[32px]", "tw:pt-[6px]", "tw:pr-[10px]",
    "tw:pb-[6px]", "tw:pl-[10px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#cbd9e8]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#cbd9e8]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#cbd9e8]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#cbd9e8]", "tw:rounded-[7px]", "tw:text-[color:#155d99]",
    "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:[font:inherit]", "tw:text-[.74rem]",
    "tw:font-[750]", "tw:cursor-pointer", "tw:hover:border-t-[color:#79abd0]", "tw:hover:border-r-[color:#79abd0]",
    "tw:hover:border-b-[color:#79abd0]", "tw:hover:border-l-[color:#79abd0]", "tw:hover:bg-[color:#f4f9fd]", "tw:hover:[background-image:none]",
    "tw:[&_.event-icon]:w-[15px]", "tw:[&_.event-icon]:h-[15px]",
  ].join(" "),
  "teacher_plan_edit_modal": sharedUtilities.teacherPlanEditModal,
  "teacher_plan_edit_dialog": sharedUtilities.teacherPlanEditDialog,
  "eyebrow": sharedUtilities.eyebrow,
  "teacher_plan_edit_close": sharedUtilities.teacherPlanEditClose,
  "teacher_plan_edit_form": sharedUtilities.teacherPlanEditForm,
  "teacher_plan_edit_actions": sharedUtilities.teacherPlanEditActions,
  "button_button_secondary_button_small": sharedUtilities.buttonButtonSecondaryButtonSmall,
  "button_button_primary_button_small": sharedUtilities.buttonButtonPrimaryButtonSmall,
} as const;
