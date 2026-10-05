import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "button_button_secondary_button_small_teacher_plan_copy_trigger": [
    "button", "button-secondary", "button-small", "teacher-plan-copy-trigger",
    "tw:inline-flex", "tw:items-center", "tw:justify-center", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]", "tw:min-h-[32px]", "tw:pt-[5px]", "tw:pr-[8px]",
    "tw:pb-[5px]", "tw:pl-[8px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-control)]", "tw:bg-[color:transparent]",
    "tw:[background-image:none]", "tw:text-[color:var(--text)]", "tw:text-[.74rem]", "tw:[transition:transform_180ms_var(--ease-standard),_border-color_180ms_var(--ease-standard),_background_180ms_var(--ease-standard),_box-shadow_180ms_var(--ease-standard),_color_180ms_var(--ease-standard)]",
    "tw:hover:border-t-[color:var(--line-strong)]", "tw:hover:border-r-[color:var(--line-strong)]", "tw:hover:border-b-[color:var(--line-strong)]", "tw:hover:border-l-[color:var(--line-strong)]",
    "tw:hover:[transform:translateY(-1px)]", "tw:hover:[box-shadow:0_10px_20px_rgba(28,_54,_89,_0.08)]", "tw:disabled:opacity-[0.72]", "tw:disabled:cursor-wait",
    "tw:[&:active]:[transform:translateY(0)]", "tw:[&:active]:[box-shadow:none]", "tw:[padding-inline:10px]",
  ].join(" "),
  "teacher_plan_edit_modal": sharedUtilities.teacherPlanEditModal,
  "teacher_plan_edit_dialog": sharedUtilities.teacherPlanEditDialog,
  "eyebrow": sharedUtilities.eyebrow,
  "teacher_plan_edit_close": sharedUtilities.teacherPlanEditClose,
  "teacher_plan_edit_form": sharedUtilities.teacherPlanEditForm,
  "teacher_plan_copy_note": [
    "teacher-plan-copy-note", "tw:mt-[-3px]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:text-[color:#60758f]", "tw:text-[.72rem]", "tw:leading-[1.45]",
  ].join(" "),
  "teacher_plan_edit_actions": sharedUtilities.teacherPlanEditActions,
  "button_button_secondary_button_small": sharedUtilities.buttonButtonSecondaryButtonSmall,
  "button_button_primary_button_small": sharedUtilities.buttonButtonPrimaryButtonSmall,
} as const;
