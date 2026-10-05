import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "profile_editor_page": [
    "profile-editor-page", "tw:grid", "tw:gap-y-[14px]", "tw:gap-x-[14px]",
    "tw:max-w-[1240px]",
  ].join(" "),
  "button_button_secondary_profile_page_back": [
    "button", "button-secondary", "profile-page-back", "tw:inline-flex",
    "tw:items-center", "tw:justify-center", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
    "tw:min-h-[34px]", "tw:pt-[0]", "tw:pr-[12px]", "tw:pb-[0]",
    "tw:pl-[12px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-control)]", "tw:bg-[color:transparent]", "tw:[background-image:none]",
    "tw:text-[color:#185d9d]", "tw:text-[.78rem]", "tw:[transition:transform_180ms_var(--ease-standard),_border-color_180ms_var(--ease-standard),_background_180ms_var(--ease-standard),_box-shadow_180ms_var(--ease-standard),_color_180ms_var(--ease-standard)]", "tw:hover:border-t-[color:var(--line-strong)]",
    "tw:hover:border-r-[color:var(--line-strong)]", "tw:hover:border-b-[color:var(--line-strong)]", "tw:hover:border-l-[color:var(--line-strong)]", "tw:hover:[transform:translateY(-1px)]",
    "tw:hover:[box-shadow:0_10px_20px_rgba(28,_54,_89,_0.08)]", "tw:disabled:opacity-[0.72]", "tw:disabled:cursor-wait", "tw:[&:active]:[transform:translateY(0)]",
    "tw:[&:active]:[box-shadow:none]", "tw:w-[fit-content]", "tw:font-[750]", "tw:[text-decoration:none]",
    "tw:hover:text-[color:#0a437a]", "tw:hover:[text-decoration:none]",
  ].join(" "),
  "section_card_profile_editor_card": [
    "section-card", "profile-editor-card", "tw:pt-[22px]", "tw:pr-[0]",
    "tw:pb-[22px]", "tw:pl-[0]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:var(--line)]", "tw:border-r-[length:0]", "tw:[border-right-style:none]", "tw:border-r-[color:currentColor]",
    "tw:border-b-[length:0]", "tw:[border-bottom-style:none]", "tw:border-b-[color:currentColor]", "tw:border-l-[length:0]",
    "tw:[border-left-style:none]", "tw:border-l-[color:currentColor]", "tw:rounded-[0]", "tw:bg-[color:transparent]",
    "tw:[background-image:none]", "tw:[box-shadow:none]", "tw:grid", "tw:gap-y-[16px]",
    "tw:gap-x-[16px]", "tw:[&_>_header]:pb-[14px]", "tw:[&_>_header]:border-b-[length:1px]", "tw:[&_>_header]:[border-bottom-style:solid]",
    "tw:[&_>_header]:border-b-[color:var(--line)]", "tw:[&_h1]:mt-[5px]", "tw:[&_h1]:mr-[0]", "tw:[&_h1]:mb-[4px]",
    "tw:[&_h1]:ml-[0]", "tw:[&_header_p]:mt-[0]", "tw:[&_header_p]:mr-[0]", "tw:[&_header_p]:mb-[0]",
    "tw:[&_header_p]:ml-[0]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "profile_editor_form": [
    "profile-editor-form", "tw:grid", "tw:gap-y-[16px]", "tw:gap-x-[16px]",
  ].join(" "),
  "profile_editor_fields": [
    "profile-editor-fields", "tw:grid", "tw:grid-cols-[minmax(220px,_.7fr)_minmax(320px,_1.3fr)]", "tw:viewport-620:grid-cols-[1fr]",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]", "tw:[&_input]:min-h-[34px]", "tw:[&_input]:pt-[7px]",
    "tw:[&_input]:pr-[9px]", "tw:[&_input]:pb-[7px]", "tw:[&_input]:pl-[9px]", "tw:[&_input]:text-[.78rem]",
  ].join(" "),
  "field": sharedUtilities.field,
  "profile_editor_actions": [
    "profile-editor-actions", "tw:flex", "tw:justify-end", "tw:gap-y-[9px]",
    "tw:gap-x-[9px]", "tw:viewport-620:items-stretch", "tw:viewport-620:[flex-direction:column-reverse]", "tw:viewport-620:[&_.button]:w-[100%]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "profile_delete_form": [
    "profile-delete-form", "tw:w-[fit-content]",
  ].join(" "),
  "button_button_danger": sharedUtilities.buttonButtonDanger,
} as const;
