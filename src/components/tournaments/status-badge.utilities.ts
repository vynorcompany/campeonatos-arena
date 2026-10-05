/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "pill": [
    "pill", "status-badge", "tw:inline-flex", "tw:items-center",
    "tw:justify-center", "tw:min-h-[34px]", "tw:pt-[0]", "tw:pr-[12px]",
    "tw:pb-[0]", "tw:pl-[12px]", "tw:rounded-[999px]", "tw:bg-[color:var(--brand-soft)]",
    "tw:[background-image:none]", "tw:text-[color:var(--brand-strong)]", "tw:text-[0.88rem]", "tw:font-[700]",
  ].join(" "),
} as const;
