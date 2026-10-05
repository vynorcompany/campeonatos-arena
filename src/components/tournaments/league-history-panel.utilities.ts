import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "league_history_empty": [
    "league-history-empty", "tw:grid", "tw:gap-y-[18px]", "tw:gap-x-[18px]",
    "tw:pt-[22px]", "tw:pr-[22px]", "tw:pb-[22px]", "tw:pl-[22px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--border)]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--border)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--border)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--border)]",
    "tw:rounded-[14px]", "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:[place-items:start]",
    "tw:[&_span]:text-[color:var(--muted)]", "tw:[&_span]:text-[.84rem]",
  ].join(" "),
  "league_history_panel": [
    "league-history-panel", "tw:grid", "tw:gap-y-[18px]", "tw:gap-x-[18px]",
    "tw:pt-[22px]", "tw:pr-[22px]", "tw:pb-[22px]", "tw:pl-[22px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--border)]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--border)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--border)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--border)]",
    "tw:rounded-[14px]", "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:[&>header]:flex",
    "tw:[&>header]:[align-items:start]", "tw:[&>header]:justify-between", "tw:[&>header]:gap-y-[16px]", "tw:[&>header]:gap-x-[16px]",
    "tw:[&_h2]:mt-[2px]", "tw:[&_h2]:mr-[0]", "tw:[&_h2]:mb-[0]", "tw:[&_h2]:ml-[0]",
    "tw:[&>header>span]:pt-[6px]", "tw:[&>header>span]:pr-[10px]", "tw:[&>header>span]:pb-[6px]", "tw:[&>header>span]:pl-[10px]",
    "tw:[&>header>span]:rounded-[999px]", "tw:[&>header>span]:bg-[color:#eef4ff]", "tw:[&>header>span]:[background-image:none]", "tw:[&>header>span]:text-[color:#1d5eb8]",
    "tw:[&>header>span]:text-[.78rem]", "tw:[&>header>span]:font-[700]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "league_history_list": [
    "league-history-list", "tw:grid", "tw:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]", "tw:gap-y-[9px]",
    "tw:gap-x-[9px]", "tw:[&_article]:grid", "tw:[&_article]:gap-y-[5px]", "tw:[&_article]:gap-x-[5px]",
    "tw:[&_article]:pt-[15px]", "tw:[&_article]:pr-[15px]", "tw:[&_article]:pb-[15px]", "tw:[&_article]:pl-[15px]",
    "tw:[&_article]:border-t-[length:1px]", "tw:[&_article]:[border-top-style:solid]", "tw:[&_article]:border-t-[color:var(--border)]", "tw:[&_article]:border-r-[length:1px]",
    "tw:[&_article]:[border-right-style:solid]", "tw:[&_article]:border-r-[color:var(--border)]", "tw:[&_article]:border-b-[length:1px]", "tw:[&_article]:[border-bottom-style:solid]",
    "tw:[&_article]:border-b-[color:var(--border)]", "tw:[&_article]:border-l-[length:1px]", "tw:[&_article]:[border-left-style:solid]", "tw:[&_article]:border-l-[color:var(--border)]",
    "tw:[&_article]:rounded-[10px]", "tw:[&_article]:bg-[color:#fbfdff]", "tw:[&_article]:[background-image:none]", "tw:[&_article_strong]:[text-transform:capitalize]",
    "tw:[&_article_span]:text-[color:var(--muted)]", "tw:[&_article_span]:text-[.84rem]", "tw:[&_article_small]:text-[color:var(--muted)]", "tw:[&_article_small]:text-[.84rem]",
  ].join(" "),
} as const;
