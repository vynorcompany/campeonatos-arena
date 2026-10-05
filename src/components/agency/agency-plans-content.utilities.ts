import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": [
    "stack-md", "agency-plans-page", "tw:grid", "tw:gap-y-[18px]",
    "tw:gap-x-[18px]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]", "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]", "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]",
    "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]", "tw:[&_>_.section-card:last-child]:border-b-[length:1px]", "tw:[&_>_.section-card:last-child]:[border-bottom-style:solid]", "tw:[&_>_.section-card:last-child]:border-b-[color:var(--line)]",
  ].join(" "),
  "page_header": sharedUtilities.pageHeader,
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "section_card_agency_billing_section": [
    "section-card", "agency-billing-section", "tw:pt-[24px]", "tw:pr-[24px]",
    "tw:pb-[24px]", "tw:pl-[24px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#d4e1f2]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#d4e1f2]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#d4e1f2]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#d4e1f2]", "tw:rounded-[14px]", "tw:bg-[color:#fff]",
    "tw:[background-image:none]", "tw:[box-shadow:none]", "tw:grid", "tw:gap-y-[20px]",
    "tw:gap-x-[20px]", "tw:[&_h2]:mt-[0]", "tw:[&_h2]:mr-[0]", "tw:[&_h2]:mb-[0]",
    "tw:[&_h2]:ml-[0]", "tw:[&_h2]:text-[1.15rem]",
  ].join(" "),
  "form_success": sharedUtilities.formSuccess,
  "form_error": sharedUtilities.formError,
  "agency_billing_connect": [
    "agency-billing-connect", "tw:flex", "tw:flex-wrap", "tw:items-center",
    "tw:gap-y-[16px]", "tw:gap-x-[16px]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "agency_grace_form": [
    "agency-grace-form", "tw:flex", "tw:flex-wrap", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:[align-items:end]", "tw:[&_.field]:w-[min(100%,_210px)]",
  ].join(" "),
  "field": sharedUtilities.field,
  "agency_grace_toggle": [
    "agency-grace-toggle", "tw:inline-flex", "tw:items-center", "tw:gap-y-[8px]",
    "tw:gap-x-[8px]", "tw:min-h-[40px]", "tw:text-[color:#264968]", "tw:text-[.8rem]",
    "tw:font-[650]", "tw:[&_input]:w-[17px]", "tw:[&_input]:h-[17px]",
  ].join(" "),
  "agency_plan_grid": [
    "agency-plan-grid", "tw:grid", "tw:grid-cols-[repeat(auto-fit,_minmax(min(100%,_250px),_1fr))]", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]",
  ].join(" "),
  "agency_plan_card": [
    "agency-plan-card", "tw:grid", "tw:[align-content:start]", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]", "tw:pt-[18px]", "tw:pr-[18px]", "tw:pb-[18px]",
    "tw:pl-[18px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#d4e1f2]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#d4e1f2]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#d4e1f2]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#d4e1f2]", "tw:rounded-[12px]", "tw:bg-[color:#f8fbff]", "tw:[background-image:none]",
    "tw:[&_>_strong]:text-[1.05rem]",
  ].join(" "),
  "agency_plan_edit": [
    "agency-plan-edit", "tw:grid", "tw:gap-y-[10px]", "tw:gap-x-[10px]",
  ].join(" "),
  "agency_plan_create": [
    "agency-plan-create", "tw:grid", "tw:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)_auto]", "tw:viewport-850:grid-cols-[1fr]",
    "tw:[align-items:end]", "tw:gap-y-[12px]", "tw:gap-x-[12px]", "tw:[&_>_.button]:min-h-[42px]",
  ].join(" "),
  "agency_subscription_list": [
    "agency-subscription-list", "tw:grid", "tw:gap-y-[10px]", "tw:gap-x-[10px]",
  ].join(" "),
  "agency_subscription_row": [
    "agency-subscription-row", "tw:grid", "tw:items-center", "tw:gap-y-[12px]",
    "tw:gap-x-[12px]", "tw:pt-[14px]", "tw:pr-[14px]", "tw:pb-[14px]",
    "tw:pl-[14px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#dce6f3]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#dce6f3]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dce6f3]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#dce6f3]", "tw:rounded-[10px]", "tw:grid-cols-[minmax(180px,_1fr)_minmax(240px,_1.2fr)_minmax(210px,_1fr)]", "tw:viewport-850:grid-cols-[1fr]",
    "tw:[&_>_div:first-child]:grid", "tw:[&_>_div:first-child]:gap-y-[4px]", "tw:[&_>_div:first-child]:gap-x-[4px]",
  ].join(" "),
  "table_subtext": sharedUtilities.tableSubtext,
  "agency_subscription_form": [
    "agency-subscription-form", "tw:flex", "tw:gap-y-[8px]", "tw:gap-x-[8px]",
    "tw:items-center", "tw:min-w-[0]", "tw:[&_select]:min-w-[0]", "tw:[&_select]:[flex:1]",
    "tw:[&_.button]:[flex:none]",
  ].join(" "),
  "button": sharedUtilities.button,
  "agency_invoice_list": [
    "agency-invoice-list", "tw:grid", "tw:gap-y-[10px]", "tw:gap-x-[10px]",
  ].join(" "),
  "agency_invoice_row": [
    "agency-invoice-row", "tw:grid", "tw:items-center", "tw:gap-y-[12px]",
    "tw:gap-x-[12px]", "tw:pt-[14px]", "tw:pr-[14px]", "tw:pb-[14px]",
    "tw:pl-[14px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#dce6f3]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#dce6f3]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dce6f3]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#dce6f3]", "tw:rounded-[10px]", "tw:grid-cols-[minmax(150px,_2fr)_repeat(4,_minmax(75px,_1fr))_minmax(110px,_1fr)]", "tw:viewport-850:grid-cols-[repeat(2,_minmax(0,_1fr))]",
  ].join(" "),
  "button_button_small": sharedUtilities.buttonButtonSmall,
} as const;
