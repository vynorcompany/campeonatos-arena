/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "t_tabs": [
    "t-tabs", "tw:flex", "tw:flex-nowrap", "tw:[overflow-x:auto]",
    "tw:gap-y-[24px]", "tw:gap-x-[24px]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--line)]",
  ].join(" "),
  "t_tab": [
    "t-tab", "tw:whitespace-nowrap", "tw:pt-[11px]", "tw:pr-[1px]",
    "tw:pb-[10px]", "tw:pl-[1px]", "tw:border-b-[length:2px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:transparent]", "tw:text-[color:var(--muted)]", "tw:text-[0.92rem]", "tw:font-[650]",
  ].join(" "),
  "t_tab_active": [
    "t-tab-active", "tw:border-b-[color:var(--brand)]", "tw:text-[color:var(--brand)]",
  ].join(" "),
} as const;
