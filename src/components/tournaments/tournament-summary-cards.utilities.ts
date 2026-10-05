/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "t_metric_grid": [
    "t-metric-grid", "tw:grid", "tw:grid-cols-[repeat(4,_minmax(0,_1fr))]", "tw:viewport-980:grid-cols-[repeat(2,_minmax(0,_1fr))]",
    "tw:viewport-680:grid-cols-[1fr]", "tw:gap-y-[20px]", "tw:gap-x-[20px]",
  ].join(" "),
} as const;
