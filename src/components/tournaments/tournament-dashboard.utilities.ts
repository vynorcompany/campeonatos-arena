/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md_t_dashboard": [
    "stack-md", "t-dashboard", "tw:grid", "tw:gap-y-[28px]",
    "tw:gap-x-[28px]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]", "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]", "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]",
    "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]", "tw:[&_>_.section-card:last-child]:border-b-[length:1px]", "tw:[&_>_.section-card:last-child]:[border-bottom-style:solid]", "tw:[&_>_.section-card:last-child]:border-b-[color:var(--line)]",
  ].join(" "),
} as const;
