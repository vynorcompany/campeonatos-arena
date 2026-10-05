/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "portal_compact_filter": [
    "portal-compact-filter", "tw:flex", "tw:gap-y-[9px]", "tw:gap-x-[9px]",
    "tw:[&_select]:min-w-[230px]", "tw:viewport-700:[&_select]:min-w-[0]", "tw:[&_select]:min-h-[38px]", "tw:[&_select]:pt-[0]",
    "tw:[&_select]:pr-[10px]", "tw:[&_select]:pb-[0]", "tw:[&_select]:pl-[10px]", "tw:[&_select]:border-t-[length:1px]",
    "tw:[&_select]:[border-top-style:solid]", "tw:[&_select]:border-t-[color:#c9dce7]", "tw:[&_select]:border-r-[length:1px]", "tw:[&_select]:[border-right-style:solid]",
    "tw:[&_select]:border-r-[color:#c9dce7]", "tw:[&_select]:border-b-[length:1px]", "tw:[&_select]:[border-bottom-style:solid]", "tw:[&_select]:border-b-[color:#c9dce7]",
    "tw:[&_select]:border-l-[length:1px]", "tw:[&_select]:[border-left-style:solid]", "tw:[&_select]:border-l-[color:#c9dce7]", "tw:[&_select]:rounded-[8px]",
    "tw:[&_select]:bg-[color:#fff]", "tw:[&_select]:[background-image:none]", "tw:[&_select]:[font:inherit]", "tw:viewport-700:flex-col",
    "tw:viewport-700:[&_select]:w-[100%]",
  ].join(" "),
} as const;
