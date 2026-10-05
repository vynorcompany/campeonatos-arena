import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "regulation_public_acceptance": [
    "regulation-public-acceptance", "tw:grid", "tw:gap-y-[10px]", "tw:gap-x-[10px]",
  ].join(" "),
  "regulation_accept_box": [
    "regulation-accept-box", "tw:grid", "tw:grid-cols-[46px_minmax(0,_1fr)_46px]", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]", "tw:items-center", "tw:min-h-[50px]", "tw:pt-[10px]",
    "tw:pr-[12px]", "tw:pb-[10px]", "tw:pl-[12px]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:#dbe4ef]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:#dbe4ef]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dbe4ef]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:#dbe4ef]", "tw:rounded-[14px]",
    "tw:bg-[color:transparent]", "tw:[background-image:linear-gradient(180deg,_#ffffff,_#fbfdff)]", "tw:[box-shadow:0_8px_16px_rgba(27,_46,_75,_0.05)]", "tw:cursor-pointer",
    "tw:[transition:transform_180ms_var(--ease-standard),_border-color_180ms_var(--ease-standard),_box-shadow_180ms_var(--ease-standard)]", "tw:hover:[transform:translateY(-1px)]", "tw:hover:border-t-[color:#c9d7e8]", "tw:hover:border-r-[color:#c9d7e8]",
    "tw:hover:border-b-[color:#c9d7e8]", "tw:hover:border-l-[color:#c9d7e8]", "tw:hover:[box-shadow:0_10px_18px_rgba(27,_46,_75,_0.06)]",
  ].join(" "),
  "regulation_accept_box_checked": [
    "regulation-accept-box-checked", "tw:border-t-[color:rgba(28,_140,_94,_0.28)]", "tw:border-r-[color:rgba(28,_140,_94,_0.28)]", "tw:border-b-[color:rgba(28,_140,_94,_0.28)]",
    "tw:border-l-[color:rgba(28,_140,_94,_0.28)]", "tw:bg-[color:transparent]", "tw:[background-image:linear-gradient(180deg,_rgba(28,_140,_94,_0.06),_rgba(255,_255,_255,_1))]", "tw:[&_.regulation-accept-box-icon]:bg-[color:rgba(28,_140,_94,_0.12)]",
    "tw:[&_.regulation-accept-box-icon]:[background-image:none]", "tw:[&_.regulation-accept-box-icon]:text-[color:var(--success)]", "tw:[&_.regulation-accept-box-shield]:bg-[color:rgba(28,_140,_94,_0.1)]", "tw:[&_.regulation-accept-box-shield]:[background-image:none]",
    "tw:[&_.regulation-accept-box-shield]:text-[color:var(--success)]",
  ].join(" "),
  "regulation_accept_box_icon": [
    "regulation-accept-box-icon", "tw:grid", "tw:place-items-center", "tw:w-[34px]",
    "tw:h-[34px]", "tw:rounded-[10px]", "tw:bg-[color:#eef3fb]", "tw:[background-image:none]",
    "tw:text-[color:var(--brand-strong)]", "tw:[&_input]:w-[16px]", "tw:[&_input]:h-[16px]", "tw:[&_input]:mt-[0]",
    "tw:[&_input]:mr-[0]", "tw:[&_input]:mb-[0]", "tw:[&_input]:ml-[0]", "tw:[&_input]:[accent-color:var(--brand)]",
  ].join(" "),
  "regulation_accept_box_text": [
    "regulation-accept-box-text", "tw:text-[0.92rem]", "tw:text-[color:var(--text)]",
  ].join(" "),
  "regulation_accept_box_shield": [
    "regulation-accept-box-shield", "tw:grid", "tw:place-items-center", "tw:w-[34px]",
    "tw:h-[34px]", "tw:rounded-[50%]", "tw:bg-[color:transparent]", "tw:[background-image:linear-gradient(180deg,_#f6f8fb,_#eef3fb)]",
    "tw:text-[color:#8695a8]", "tw:text-[0.92rem]",
  ].join(" "),
  "regulation_public_actions": [
    "regulation-public-actions", "tw:flex", "tw:[justify-content:stretch]", "tw:[&_.button]:w-[100%]",
  ].join(" "),
  "button_button_primary_button_block": sharedUtilities.buttonButtonPrimaryButtonBlock,
  "regulation_public_helper": [
    "regulation-public-helper", "tw:mt-[-2px]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:text-center", "tw:text-[color:var(--muted)]", "tw:text-[0.82rem]",
    "tw:[&_span]:mr-[8px]",
  ].join(" "),
  "form_error": sharedUtilities.formError,
  "form_success": sharedUtilities.formSuccess,
} as const;
