import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "permission_profiles_card": [
    "permission-profiles-card", "tw:gap-y-[16px]", "tw:gap-x-[16px]",
  ].join(" "),
  "setting_create_panel_permission_profile_create_panel": [
    "setting-create-panel", "permission-profile-create-panel", "tw:mb-[14px]", "tw:[&_>_summary]:w-[fit-content]",
    "tw:[&_>_summary]:[list-style:none]", "tw:[&_>_summary]:cursor-pointer", "tw:[&_>_summary::-webkit-details-marker]:hidden", "tw:[&_>_div]:mt-[12px]",
    "tw:w-[fit-content]", "tw:[&[open]]:grid", "tw:[&[open]]:w-[min(100%,_760px)]", "tw:[&[open]]:gap-y-[13px]",
    "tw:[&[open]]:gap-x-[13px]",
  ].join(" "),
  "button_button_primary_button_small": sharedUtilities.buttonButtonPrimaryButtonSmall,
  "permission_profile_create_form": [
    "permission-profile-create-form", "tw:grid", "tw:grid-cols-[minmax(150px,_220px)_minmax(210px,_360px)_auto]", "tw:[align-items:end]",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]", "tw:max-w-[700px]", "tw:viewport-620:[&_.button]:w-[100%]",
    "tw:[&_input]:min-h-[34px]", "tw:[&_input]:pt-[7px]", "tw:[&_input]:pr-[9px]", "tw:[&_input]:pb-[7px]",
    "tw:[&_input]:pl-[9px]", "tw:[&_input]:text-[.78rem]",
  ].join(" "),
  "field": sharedUtilities.field,
  "standard_list_permission_profiles_list": [
    "standard-list", "permission-profiles-list", "tw:[overflow-x:hidden]", "tw:viewport-620:[overflow-x:auto]",
    "tw:[overflow-y:hidden]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#d9e4ef]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#d9e4ef]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#d9e4ef]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#d9e4ef]", "tw:rounded-[9px]", "tw:bg-[color:#fff]", "tw:[background-image:none]",
    "tw:[--profile-columns:minmax(150px,_.8fr)_minmax(260px,_1.7fr)_minmax(95px,_.45fr)_minmax(110px,_.45fr)]",
  ].join(" "),
  "standard_list_head": [
    "standard-list-head", "tw:grid", "tw:grid-cols-[var(--profile-columns)]", "tw:items-center",
    "tw:gap-y-[18px]", "tw:gap-x-[18px]", "tw:min-h-[38px]", "tw:pt-[8px]",
    "tw:pr-[14px]", "tw:pb-[8px]", "tw:pl-[14px]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#d9e4ef]", "tw:text-[color:#58708b]", "tw:bg-[color:#f5f8fc]",
    "tw:[background-image:none]", "tw:text-[.66rem]", "tw:font-[800]", "tw:tracking-[.035em]",
    "tw:uppercase", "tw:viewport-620:min-w-[610px]",
  ].join(" "),
  "standard_list_row": [
    "standard-list-row", "permission-profile-row", "tw:grid", "tw:grid-cols-[var(--profile-columns)]",
    "tw:items-center", "tw:gap-y-[18px]", "tw:gap-x-[18px]", "tw:min-h-[58px]",
    "tw:pt-[10px]", "tw:pr-[14px]", "tw:pb-[10px]", "tw:pl-[14px]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#e5edf4]", "tw:text-[color:#48627d]",
    "tw:text-[.78rem]", "tw:[text-decoration:none]", "tw:[transition:background_.15s_ease,_color_.15s_ease]", "tw:[&:last-of-type]:border-b-[length:0]",
    "tw:[&:last-of-type]:[border-bottom-style:none]", "tw:[&:last-of-type]:border-b-[color:currentColor]", "tw:hover:text-[color:#183e68]", "tw:hover:bg-[color:#f7fbff]",
    "tw:hover:[background-image:none]", "tw:[&_strong]:text-[color:#143b67]", "tw:[&_strong]:text-[.8rem]", "tw:viewport-620:min-w-[610px]",
  ].join(" "),
  "permission_profile_members": [
    "permission-profile-members", "tw:min-w-[0]", "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]",
    "tw:text-[color:#365b7d]", "tw:leading-[1.45]", "tw:text-ellipsis", "tw:whitespace-nowrap",
  ].join(" "),
  "standard_list_action": [
    "standard-list-action", "tw:[justify-self:start]", "tw:text-[color:#1764b7]", "tw:font-[750]",
    "tw:[&_b]:ml-[4px]", "tw:[&_b]:text-[1rem]",
  ].join(" "),
  "standard_list_empty": [
    "standard-list-empty", "tw:mt-[0]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:pt-[28px]", "tw:pr-[14px]", "tw:pb-[28px]",
    "tw:pl-[14px]", "tw:text-[color:var(--muted)]", "tw:text-[.8rem]", "tw:text-center",
  ].join(" "),
} as const;
