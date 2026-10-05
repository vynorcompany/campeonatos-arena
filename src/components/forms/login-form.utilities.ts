import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md_login_form": [
    "stack-md", "login-form", "tw:grid", "tw:gap-y-[19px]",
    "tw:gap-x-[19px]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]", "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]", "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]",
    "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]", "tw:[&_>_.section-card:last-child]:border-b-[length:1px]", "tw:[&_>_.section-card:last-child]:[border-bottom-style:solid]", "tw:[&_>_.section-card:last-child]:border-b-[color:var(--line)]",
    "tw:[&_.field]:gap-y-[7px]", "tw:[&_.field]:gap-x-[7px]", "tw:[&_.field_label]:text-[color:#233f5e]", "tw:[&_.field_label]:text-[.8rem]",
    "tw:[&_.field_label]:font-[750]", "tw:[&_.field_input]:min-h-[48px]", "tw:[&_.field_input]:rounded-[8px]", "tw:[&_.field_input]:bg-[color:#fbfdff]",
    "tw:[&_.field_input]:[background-image:none]", "tw:[&_.button-block]:min-h-[46px]", "tw:[&_.button-block]:mt-[4px]", "tw:[&_.button-block]:rounded-[8px]",
    "tw:[&_.button-block]:font-[750]",
  ].join(" "),
  "field": sharedUtilities.field,
  "login_forgot_link": [
    "login-forgot-link", "tw:[justify-self:end]", "tw:mt-[2px]", "tw:text-[color:#1a64ad]",
    "tw:text-[.78rem]", "tw:font-[650]",
  ].join(" "),
  "form_error": sharedUtilities.formError,
  "button_button_primary_button_block": sharedUtilities.buttonButtonPrimaryButtonBlock,
} as const;
