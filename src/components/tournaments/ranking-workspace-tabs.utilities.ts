import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "section_actions_ranking_detail_tabs": [
    "section-actions", "ranking-detail-tabs", "tw:flex", "tw:flex-wrap",
    "tw:gap-y-[6px]", "tw:gap-x-[6px]", "tw:pt-[4px]", "tw:pr-[4px]",
    "tw:pb-[4px]", "tw:pl-[4px]", "tw:w-[fit-content]", "tw:viewport-680:w-[100%]",
    "tw:max-w-[100%]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#dbe7f1]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#dbe7f1]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dbe7f1]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#dbe7f1]", "tw:rounded-[9px]", "tw:bg-[color:#f7faff]", "tw:[background-image:none]",
    "tw:[&_.button]:border-t-[length:0]", "tw:[&_.button]:[border-top-style:none]", "tw:[&_.button]:border-t-[color:currentColor]", "tw:[&_.button]:border-r-[length:0]",
    "tw:[&_.button]:[border-right-style:none]", "tw:[&_.button]:border-r-[color:currentColor]", "tw:[&_.button]:border-b-[length:0]", "tw:[&_.button]:[border-bottom-style:none]",
    "tw:[&_.button]:border-b-[color:currentColor]", "tw:[&_.button]:border-l-[length:0]", "tw:[&_.button]:[border-left-style:none]", "tw:[&_.button]:border-l-[color:currentColor]",
    "tw:[&_.button]:[box-shadow:none]", "tw:viewport-680:[&_.button]:[flex:1_1_calc(50%_-_6px)]",
  ].join(" "),
  "button": sharedUtilities.button,
  "button_primary": [
    "button-primary", "tw:border-t-[color:var(--brand)]", "tw:border-r-[color:var(--brand)]", "tw:border-b-[color:var(--brand)]",
    "tw:border-l-[color:var(--brand)]", "tw:bg-[color:var(--brand)]", "tw:[background-image:none]", "tw:text-[color:#ffffff]",
    "tw:hover:border-t-[color:var(--brand-strong)]", "tw:hover:border-r-[color:var(--brand-strong)]", "tw:hover:border-b-[color:var(--brand-strong)]", "tw:hover:border-l-[color:var(--brand-strong)]",
    "tw:hover:bg-[color:var(--brand-strong)]", "tw:hover:[background-image:none]",
  ].join(" "),
} as const;
