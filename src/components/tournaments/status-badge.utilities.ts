/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  compact: "status-badge tw:inline-flex tw:w-fit tw:min-h-6 tw:items-center tw:justify-center tw:rounded-[3px] tw:border tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium tw:leading-4 tw:[background-image:none]",
  states: {
    WAITING: "tw:border-[#d6b98e] tw:bg-[#fff7ed] tw:text-[#854d0e]",
    SCHEDULED: "tw:border-[#a9c3df] tw:bg-[#eff6ff] tw:text-[#174983]",
    LIVE: "tw:border-[#7bb49d] tw:bg-[#ecfdf5] tw:text-[#065f46]",
    IN_PROGRESS: "tw:border-[#7bb49d] tw:bg-[#ecfdf5] tw:text-[#065f46]",
    FINISHED: "tw:border-[#aab7c6] tw:bg-[#f8fafc] tw:text-[#334155]",
  },
  "pill": [
    "pill", "status-badge", "tw:inline-flex", "tw:items-center",
    "tw:justify-center", "tw:min-h-[34px]", "tw:pt-[0]", "tw:pr-[12px]",
    "tw:pb-[0]", "tw:pl-[12px]", "tw:rounded-[999px]", "tw:bg-[color:var(--brand-soft)]",
    "tw:[background-image:none]", "tw:text-[color:var(--brand-strong)]", "tw:text-[0.88rem]", "tw:font-[700]",
  ].join(" "),
} as const;
