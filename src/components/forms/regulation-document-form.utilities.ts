import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "grid_form": sharedUtilities.gridForm,
  "field_form_full": sharedUtilities.fieldFormFull,
  "regulation_textarea": [
    "regulation-textarea", "tw:min-h-[280px]", "tw:[resize:vertical]", "tw:leading-[1.55]",
  ].join(" "),
  "field_field_submit_form_full": sharedUtilities.fieldFieldSubmitFormFull,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error_form_full": sharedUtilities.formErrorFormFull,
  "form_success_form_full_regulation_link_success": [
    "form-success", "form-full", "regulation-link-success", "tw:mt-[0]",
    "tw:mr-[0]", "tw:mb-[0]", "tw:ml-[0]", "tw:pt-[12px]",
    "tw:pr-[14px]", "tw:pb-[12px]", "tw:pl-[14px]", "tw:rounded-[0]",
    "tw:text-[0.95rem]", "tw:leading-[1.45]", "tw:bg-[color:rgba(28,_140,_94,_0.08)]", "tw:[background-image:none]",
    "tw:text-[color:var(--success)]", "tw:[grid-column:1_/_-1]", "tw:grid", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]",
  ].join(" "),
} as const;
