import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "section_card": sharedUtilities.sectionCard2,
  "muted": sharedUtilities.muted,
  "grid_form": sharedUtilities.gridForm,
  "field": sharedUtilities.field,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error_form_full": sharedUtilities.formErrorFormFull,
  "form_success_form_full": sharedUtilities.formSuccessFormFull,
  "simple_list": sharedUtilities.simpleList,
  "simple_item": [
    "simple-item", "tw:[align-items:flex-start]", "tw:[gap:0.5rem]", "tw:flex",
    "tw:viewport-760:grid", "tw:items-center", "tw:justify-between", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:pt-[16px]", "tw:pr-[16px]", "tw:pb-[16px]",
    "tw:pl-[16px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-md)]", "tw:bg-[color:#ffffff]", "tw:[background-image:none]",
    "tw:[transition:transform_200ms_var(--ease-standard),_border-color_200ms_var(--ease-standard),_box-shadow_200ms_var(--ease-standard),_background_200ms_var(--ease-standard)]", "tw:hover:[transform:translateY(-2px)]", "tw:hover:border-t-[color:var(--line-strong)]", "tw:hover:border-r-[color:var(--line-strong)]",
    "tw:hover:border-b-[color:var(--line-strong)]", "tw:hover:border-l-[color:var(--line-strong)]", "tw:hover:[box-shadow:0_12px_22px_rgba(31,_61,_95,_0.06)]", "tw:hover:bg-[color:#ffffff]",
    "tw:hover:[background-image:none]",
  ].join(" "),
  "stack_xs": [
    "stack-xs", "tw:[width:100%]", "tw:grid", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]",
  ].join(" "),
  "section_actions": [
    "section-actions", "tw:[gap:0.5rem]", "tw:[flex-wrap:wrap]", "tw:[justify-content:flex-start]",
    "tw:flex", "tw:flex-wrap", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
  ].join(" "),
  "player_status_pill": [
    "player-status-pill", "tw:inline-flex", "tw:items-center", "tw:min-h-[32px]",
    "tw:pt-[0]", "tw:pr-[12px]", "tw:pb-[0]", "tw:pl-[12px]",
    "tw:rounded-[999px]", "tw:bg-[color:rgba(28,_140,_94,_0.12)]", "tw:[background-image:none]", "tw:text-[color:var(--success)]",
    "tw:text-[0.86rem]", "tw:font-[700]",
  ].join(" "),
  "player_status_pill_inactive": [
    "player-status-pill-inactive", "tw:bg-[color:rgba(191,_63,_56,_0.1)]", "tw:[background-image:none]", "tw:text-[color:var(--danger)]",
  ].join(" "),
  "button": sharedUtilities.button,
  "grid_form_2": [
    "grid-form", "tw:[margin-top:0.75rem]", "tw:grid", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:grid-cols-[repeat(3,_minmax(0,_1fr))]", "tw:viewport-1120:grid-cols-[1fr]", "tw:[&_textarea]:w-[100%]",
    "tw:[&_textarea]:pt-[12px]", "tw:[&_textarea]:pr-[14px]", "tw:[&_textarea]:pb-[12px]", "tw:[&_textarea]:pl-[14px]",
    "tw:[&_textarea]:border-t-[length:1px]", "tw:[&_textarea]:[border-top-style:solid]", "tw:[&_textarea]:border-t-[color:var(--line)]", "tw:[&_textarea]:border-r-[length:1px]",
    "tw:[&_textarea]:[border-right-style:solid]", "tw:[&_textarea]:border-r-[color:var(--line)]", "tw:[&_textarea]:border-b-[length:1px]", "tw:[&_textarea]:[border-bottom-style:solid]",
    "tw:[&_textarea]:border-b-[color:var(--line)]", "tw:[&_textarea]:border-l-[length:1px]", "tw:[&_textarea]:[border-left-style:solid]", "tw:[&_textarea]:border-l-[color:var(--line)]",
    "tw:[&_textarea]:rounded-[var(--radius-md)]", "tw:[&_textarea]:bg-[color:var(--panel)]", "tw:[&_textarea]:[background-image:none]", "tw:[&_textarea]:text-[color:var(--text)]",
  ].join(" "),
} as const;
