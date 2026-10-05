import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "settings_coupon_status": [
    "settings-coupon-status", "tw:grid", "tw:[justify-items:start]", "tw:gap-y-[4px]",
    "tw:gap-x-[4px]", "tw:[&_.control-toggle]:cursor-pointer", "tw:[&_.control-toggle]:border-t-[length:0]", "tw:[&_.control-toggle]:[border-top-style:none]",
    "tw:[&_.control-toggle]:border-t-[color:currentColor]", "tw:[&_.control-toggle]:border-r-[length:0]", "tw:[&_.control-toggle]:[border-right-style:none]", "tw:[&_.control-toggle]:border-r-[color:currentColor]",
    "tw:[&_.control-toggle]:border-b-[length:0]", "tw:[&_.control-toggle]:[border-bottom-style:none]", "tw:[&_.control-toggle]:border-b-[color:currentColor]", "tw:[&_.control-toggle]:border-l-[length:0]",
    "tw:[&_.control-toggle]:[border-left-style:none]", "tw:[&_.control-toggle]:border-l-[color:currentColor]", "tw:[&_.control-toggle]:bg-[color:transparent]", "tw:[&_.control-toggle]:[background-image:none]",
    "tw:[&_.control-toggle]:[font:inherit]", "tw:[&_.control-toggle[aria-checked=true]_span]:border-t-[color:#238448]", "tw:[&_.control-toggle[aria-checked=true]_span]:border-r-[color:#238448]", "tw:[&_.control-toggle[aria-checked=true]_span]:border-b-[color:#238448]",
    "tw:[&_.control-toggle[aria-checked=true]_span]:border-l-[color:#238448]", "tw:[&_.control-toggle[aria-checked=true]_span]:bg-[color:#2fa457]", "tw:[&_.control-toggle[aria-checked=true]_span]:[background-image:none]", "tw:[&_.control-toggle[aria-checked=true]_span::after]:[transform:translateX(13px)]",
    "tw:[&_.control-toggle:focus-visible_span]:[outline:2px_solid_var(--brand)]", "tw:[&_.control-toggle:focus-visible_span]:[outline-offset:2px]", "tw:[&_.control-toggle:disabled]:cursor-wait", "tw:[&_.control-toggle:disabled]:opacity-[.65]",
  ].join(" "),
  "control_toggle": sharedUtilities.controlToggle,
  "form_error": sharedUtilities.formError,
} as const;
