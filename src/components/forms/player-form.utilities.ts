import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "grid_form_client_create_form": [
    "grid-form", "client-create-form", "tw:grid", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]", "tw:grid-cols-[repeat(3,_minmax(0,_1fr))]", "tw:viewport-700:grid-cols-[1fr]", "tw:[&_textarea]:w-[100%]",
    "tw:[&_textarea]:pt-[12px]", "tw:[&_textarea]:pr-[14px]", "tw:[&_textarea]:pb-[12px]", "tw:[&_textarea]:pl-[14px]",
    "tw:[&_textarea]:border-t-[length:1px]", "tw:[&_textarea]:[border-top-style:solid]", "tw:[&_textarea]:border-t-[color:var(--line)]", "tw:[&_textarea]:border-r-[length:1px]",
    "tw:[&_textarea]:[border-right-style:solid]", "tw:[&_textarea]:border-r-[color:var(--line)]", "tw:[&_textarea]:border-b-[length:1px]", "tw:[&_textarea]:[border-bottom-style:solid]",
    "tw:[&_textarea]:border-b-[color:var(--line)]", "tw:[&_textarea]:border-l-[length:1px]", "tw:[&_textarea]:[border-left-style:solid]", "tw:[&_textarea]:border-l-[color:var(--line)]",
    "tw:[&_textarea]:rounded-[var(--radius-md)]", "tw:[&_textarea]:bg-[color:var(--panel)]", "tw:[&_textarea]:[background-image:none]", "tw:[&_textarea]:text-[color:var(--text)]",
    "tw:[&_.field]:min-w-[0]", "tw:[&_:is(input,_select)]:min-h-[34px]", "tw:[&_:is(input,_select)]:pt-[7px]", "tw:[&_:is(input,_select)]:pr-[9px]",
    "tw:[&_:is(input,_select)]:pb-[7px]", "tw:[&_:is(input,_select)]:pl-[9px]", "tw:[&_:is(input,_select)]:rounded-[6px]", "tw:[&_:is(input,_select)]:text-[.78rem]",
    "tw:[&_.field-submit]:[align-self:end]", "tw:[&_.control-toggle]:[align-self:end]", "tw:[&_.control-toggle]:min-h-[34px]",
  ].join(" "),
  "field": sharedUtilities.field,
  "field_form_full": sharedUtilities.fieldFormFull,
  "control_toggle": sharedUtilities.controlToggle,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "sr_only": sharedUtilities.srOnly,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error_form_full": sharedUtilities.formErrorFormFull,
  "form_success_form_full": sharedUtilities.formSuccessFormFull,
} as const;
