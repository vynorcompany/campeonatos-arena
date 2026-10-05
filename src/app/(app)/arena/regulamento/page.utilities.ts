import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "page_header": sharedUtilities.pageHeader,
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "two_column_grid": sharedUtilities.twoColumnGrid,
  "regulation_link_panel": [
    "regulation-link-panel", "tw:grid", "tw:gap-y-[8px]", "tw:gap-x-[8px]",
    "tw:mb-[14px]", "tw:pt-[16px]", "tw:pr-[16px]", "tw:pb-[16px]",
    "tw:pl-[16px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:var(--line)]", "tw:rounded-[var(--radius-md)]", "tw:bg-[color:var(--panel-muted)]", "tw:[background-image:none]",
  ].join(" "),
  "regulation_link": [
    "regulation-link", "tw:inline-flex", "tw:items-center", "tw:min-h-[42px]",
    "tw:pt-[0]", "tw:pr-[12px]", "tw:pb-[0]", "tw:pl-[12px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]",
    "tw:rounded-[var(--radius-md)]", "tw:bg-[color:#ffffff]", "tw:[background-image:none]", "tw:text-[color:var(--brand-strong)]",
    "tw:[word-break:break-all]",
  ].join(" "),
  "regulation_history": [
    "regulation-history", "tw:grid", "tw:gap-y-[14px]", "tw:gap-x-[14px]",
  ].join(" "),
  "regulation_history_item": [
    "regulation-history-item", "tw:grid", "tw:gap-y-[12px]", "tw:gap-x-[12px]",
    "tw:pt-[16px]", "tw:pr-[16px]", "tw:pb-[16px]", "tw:pl-[16px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]",
    "tw:rounded-[var(--radius-md)]", "tw:bg-[color:var(--panel-muted)]", "tw:[background-image:none]", "tw:[&_strong]:text-[1rem]",
  ].join(" "),
  "regulation_history_content": [
    "regulation-history-content", "tw:mt-[0]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:whitespace-pre-wrap", "tw:leading-[1.55]", "tw:text-[color:var(--text)]",
  ].join(" "),
} as const;
