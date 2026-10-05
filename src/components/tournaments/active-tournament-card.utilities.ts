import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "t_active_card": [
    "t-active-card", "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]", "tw:rounded-[20px]",
    "tw:[box-shadow:var(--shadow)]", "tw:pt-[28px]", "tw:pr-[28px]", "tw:pb-[28px]",
    "tw:pl-[28px]", "tw:grid", "tw:gap-y-[20px]", "tw:gap-x-[20px]",
  ].join(" "),
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "muted": sharedUtilities.muted,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "t_active_head": [
    "t-active-head", "tw:flex", "tw:justify-between", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:items-start",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "t_active_stats": [
    "t-active-stats", "tw:flex", "tw:flex-wrap", "tw:gap-y-[14px]",
    "tw:gap-x-[14px]", "tw:[&_span]:bg-[color:var(--panel-muted)]", "tw:[&_span]:[background-image:none]", "tw:[&_span]:border-t-[length:1px]",
    "tw:[&_span]:[border-top-style:solid]", "tw:[&_span]:border-t-[color:var(--line)]", "tw:[&_span]:border-r-[length:1px]", "tw:[&_span]:[border-right-style:solid]",
    "tw:[&_span]:border-r-[color:var(--line)]", "tw:[&_span]:border-b-[length:1px]", "tw:[&_span]:[border-bottom-style:solid]", "tw:[&_span]:border-b-[color:var(--line)]",
    "tw:[&_span]:border-l-[length:1px]", "tw:[&_span]:[border-left-style:solid]", "tw:[&_span]:border-l-[color:var(--line)]", "tw:[&_span]:rounded-[999px]",
    "tw:[&_span]:pt-[8px]", "tw:[&_span]:pr-[14px]", "tw:[&_span]:pb-[8px]", "tw:[&_span]:pl-[14px]",
    "tw:[&_span]:text-[0.9rem]",
  ].join(" "),
  "t_progress_wrap": [
    "t-progress-wrap", "tw:grid", "tw:gap-y-[10px]", "tw:gap-x-[10px]",
  ].join(" "),
  "t_progress_meta": [
    "t-progress-meta", "tw:flex", "tw:justify-between", "tw:text-[color:var(--muted)]",
  ].join(" "),
  "t_progress_bar": [
    "t-progress-bar", "tw:h-[10px]", "tw:rounded-[999px]", "tw:bg-[color:#eef3f9]",
    "tw:[background-image:none]", "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]", "tw:[&_span]:block",
    "tw:[&_span]:h-[100%]", "tw:[&_span]:bg-[color:transparent]", "tw:[&_span]:[background-image:linear-gradient(90deg,_#1e5ea8,_#2f7fd4)]",
  ].join(" "),
  "section_actions": sharedUtilities.sectionActions,
  "button": sharedUtilities.button,
} as const;
