import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "field": sharedUtilities.field,
  "field_form_full": [
    "field", "field-inline", "form-full", "tw:grid",
    "tw:gap-y-[8px]", "tw:gap-x-[8px]", "tw:[&_label]:text-[0.92rem]", "tw:[&_label]:font-[600]",
    "tw:[&_input]:w-[100%]", "tw:[&_input]:min-h-[44px]", "tw:[&_input]:pt-[0]", "tw:[&_input]:pr-[14px]",
    "tw:[&_input]:pb-[0]", "tw:[&_input]:pl-[14px]", "tw:[&_input]:border-t-[length:1px]", "tw:[&_input]:[border-top-style:solid]",
    "tw:[&_input]:border-t-[color:var(--line)]", "tw:[&_input]:border-r-[length:1px]", "tw:[&_input]:[border-right-style:solid]", "tw:[&_input]:border-r-[color:var(--line)]",
    "tw:[&_input]:border-b-[length:1px]", "tw:[&_input]:[border-bottom-style:solid]", "tw:[&_input]:border-b-[color:var(--line)]", "tw:[&_input]:border-l-[length:1px]",
    "tw:[&_input]:[border-left-style:solid]", "tw:[&_input]:border-l-[color:var(--line)]", "tw:[&_input]:rounded-[var(--radius-md)]", "tw:[&_input]:bg-[color:var(--panel)]",
    "tw:[&_input]:[background-image:none]", "tw:[&_input]:text-[color:var(--text)]", "tw:[&_input]:[transition:border-color_180ms_var(--ease-standard),_box-shadow_180ms_var(--ease-standard),_transform_180ms_var(--ease-standard)]", "tw:[&_select]:w-[100%]",
    "tw:[&_select]:min-h-[44px]", "tw:[&_select]:pt-[0]", "tw:[&_select]:pr-[14px]", "tw:[&_select]:pb-[0]",
    "tw:[&_select]:pl-[14px]", "tw:[&_select]:border-t-[length:1px]", "tw:[&_select]:[border-top-style:solid]", "tw:[&_select]:border-t-[color:var(--line)]",
    "tw:[&_select]:border-r-[length:1px]", "tw:[&_select]:[border-right-style:solid]", "tw:[&_select]:border-r-[color:var(--line)]", "tw:[&_select]:border-b-[length:1px]",
    "tw:[&_select]:[border-bottom-style:solid]", "tw:[&_select]:border-b-[color:var(--line)]", "tw:[&_select]:border-l-[length:1px]", "tw:[&_select]:[border-left-style:solid]",
    "tw:[&_select]:border-l-[color:var(--line)]", "tw:[&_select]:rounded-[var(--radius-md)]", "tw:[&_select]:bg-[color:var(--panel)]", "tw:[&_select]:[background-image:none]",
    "tw:[&_select]:text-[color:var(--text)]", "tw:[&_select]:[transition:border-color_180ms_var(--ease-standard),_box-shadow_180ms_var(--ease-standard),_transform_180ms_var(--ease-standard)]", "tw:[&_input:focus]:[outline:none]", "tw:[&_input:focus]:border-t-[color:rgba(30,_94,_168,_0.44)]",
    "tw:[&_input:focus]:border-r-[color:rgba(30,_94,_168,_0.44)]", "tw:[&_input:focus]:border-b-[color:rgba(30,_94,_168,_0.44)]", "tw:[&_input:focus]:border-l-[color:rgba(30,_94,_168,_0.44)]", "tw:[&_input:focus]:[box-shadow:0_0_0_4px_rgba(30,_94,_168,_0.12)]",
    "tw:[&_input:focus]:[transform:translateY(-1px)]", "tw:[&_select:focus]:[outline:none]", "tw:[&_select:focus]:border-t-[color:rgba(30,_94,_168,_0.44)]", "tw:[&_select:focus]:border-r-[color:rgba(30,_94,_168,_0.44)]",
    "tw:[&_select:focus]:border-b-[color:rgba(30,_94,_168,_0.44)]", "tw:[&_select:focus]:border-l-[color:rgba(30,_94,_168,_0.44)]", "tw:[&_select:focus]:[box-shadow:0_0_0_4px_rgba(30,_94,_168,_0.12)]", "tw:[&_select:focus]:[transform:translateY(-1px)]",
    "tw:[&_input[type=file]]:pt-[10px]", "tw:[&_input[type=file]]:pr-[14px]", "tw:[&_input[type=file]]:pb-[10px]", "tw:[&_input[type=file]]:pl-[14px]",
    "tw:[&_input[type=checkbox]]:w-[auto]", "tw:[&_input[type=checkbox]]:min-h-[auto]", "tw:[&_input[type=checkbox]]:pt-[0]", "tw:[&_input[type=checkbox]]:pr-[0]",
    "tw:[&_input[type=checkbox]]:pb-[0]", "tw:[&_input[type=checkbox]]:pl-[0]", "tw:[&_input[type=radio]]:w-[auto]", "tw:[&_input[type=radio]]:min-h-[auto]",
    "tw:[&_input[type=radio]]:pt-[0]", "tw:[&_input[type=radio]]:pr-[0]", "tw:[&_input[type=radio]]:pb-[0]", "tw:[&_input[type=radio]]:pl-[0]",
    "tw:[grid-column:1_/_-1]",
  ].join(" "),
} as const;
