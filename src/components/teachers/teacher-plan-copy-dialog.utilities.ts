import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "teacher_plan_edit_form": "teacher-plan-copy-form tw:flex tw:min-h-full tw:min-w-0 tw:flex-col tw:gap-4",
  "teacher_plan_copy_note": [
    "teacher-plan-copy-note", "tw:mt-[-3px]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:text-[color:#60758f]", "tw:text-[.72rem]", "tw:leading-[1.45]",
  ].join(" "),
  "teacher_plan_edit_actions": sharedUtilities.teacherPlanEditActions + " tw:mt-auto",
  "button_button_secondary_button_small": sharedUtilities.buttonButtonSecondaryButtonSmall,
  "button_button_primary_button_small": sharedUtilities.buttonButtonPrimaryButtonSmall,
} as const;
