/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "metric_card": [
    "metric-card", "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]", "tw:rounded-[18px]",
    "tw:[box-shadow:0_8px_24px_rgba(17,_41,_73,_0.08)]", "tw:pt-[24px]", "tw:pr-[24px]", "tw:pb-[24px]",
    "tw:pl-[24px]", "tw:grid", "tw:gap-y-[8px]", "tw:gap-x-[8px]",
    "tw:[&_span]:text-[color:var(--muted)]", "tw:[&_span]:text-[0.85rem]", "tw:[&_strong]:text-[1.8rem]", "tw:[&_strong]:tracking-[-0.03em]",
    "tw:[&_small]:text-[color:var(--muted)]",
  ].join(" "),
} as const;
