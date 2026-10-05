import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "workspace_page_assistant_page": [
    "workspace-page", "assistant-page", "tw:grid", "tw:gap-y-[24px]",
    "tw:viewport-720:gap-y-[18px]", "tw:gap-x-[24px]", "tw:viewport-720:gap-x-[18px]", "tw:pt-[5px]",
    "tw:pr-[0]", "tw:pb-[44px]", "tw:pl-[0]", "tw:[&_.page-header]:pt-[4px]",
    "tw:[&_.page-header]:pr-[0]", "tw:[&_.page-header]:pb-[20px]", "tw:[&_.page-header]:pl-[0]", "tw:[&_.page-header]:border-b-[length:1px]",
    "tw:[&_.page-header]:[border-bottom-style:solid]", "tw:[&_.page-header]:border-b-[color:#dfe7f1]", "tw:[&_.page-header_h1]:text-[color:#102b56]", "tw:[&_.page-header_h1]:text-[clamp(1.75rem,_2.3vw,_2.25rem)]",
    "tw:[&_.page-header_h1]:tracking-[-.045em]", "tw:[&_.stats-grid]:gap-y-[16px]", "tw:[&_.stats-grid]:gap-x-[16px]", "tw:[&_.stat-card]:pt-[20px]",
    "tw:[&_.stat-card]:pr-[20px]", "tw:[&_.stat-card]:pb-[20px]", "tw:[&_.stat-card]:pl-[20px]", "tw:[&_.stat-card]:border-t-[length:1px]",
    "tw:[&_.stat-card]:[border-top-style:solid]", "tw:[&_.stat-card]:border-t-[color:#e2e9f3]", "tw:[&_.stat-card]:border-r-[length:1px]", "tw:[&_.stat-card]:[border-right-style:solid]",
    "tw:[&_.stat-card]:border-r-[color:#e2e9f3]", "tw:[&_.stat-card]:border-b-[length:1px]", "tw:[&_.stat-card]:[border-bottom-style:solid]", "tw:[&_.stat-card]:border-b-[color:#e2e9f3]",
    "tw:[&_.stat-card]:border-l-[length:1px]", "tw:[&_.stat-card]:[border-left-style:solid]", "tw:[&_.stat-card]:border-l-[color:#e2e9f3]", "tw:[&_.stat-card]:rounded-[14px]",
    "tw:[&_.stat-card]:bg-[color:#fff]", "tw:[&_.stat-card]:[background-image:none]", "tw:[&_.stat-card]:[box-shadow:0_8px_22px_rgba(19,_55,_104,_.06)]", "tw:[&_.dashboard-grid]:gap-y-[18px]",
    "tw:[&_.dashboard-grid]:gap-x-[18px]", "tw:[&_.section-card]:pt-[21px]", "tw:viewport-720:[&_.section-card]:pt-[16px]", "tw:[&_.section-card]:pr-[21px]",
    "tw:viewport-720:[&_.section-card]:pr-[16px]", "tw:[&_.section-card]:pb-[21px]", "tw:viewport-720:[&_.section-card]:pb-[16px]", "tw:[&_.section-card]:pl-[21px]",
    "tw:viewport-720:[&_.section-card]:pl-[16px]", "tw:[&_.section-card]:border-t-[length:1px]", "tw:[&_.section-card]:[border-top-style:solid]", "tw:[&_.section-card]:border-t-[color:#e2e9f3]",
    "tw:[&_.section-card]:border-r-[length:1px]", "tw:[&_.section-card]:[border-right-style:solid]", "tw:[&_.section-card]:border-r-[color:#e2e9f3]", "tw:[&_.section-card]:border-b-[length:1px]",
    "tw:[&_.section-card]:[border-bottom-style:solid]", "tw:[&_.section-card]:border-b-[color:#e2e9f3]", "tw:[&_.section-card]:border-l-[length:1px]", "tw:[&_.section-card]:[border-left-style:solid]",
    "tw:[&_.section-card]:border-l-[color:#e2e9f3]", "tw:[&_.section-card]:rounded-[14px]", "tw:[&_.section-card]:bg-[color:#fff]", "tw:[&_.section-card]:[background-image:none]",
    "tw:[&_.section-card]:[box-shadow:0_8px_22px_rgba(19,_55,_104,_.05)]", "tw:[&_.section-card_+_.section-card]:border-t-[length:1px]", "tw:[&_.section-card_+_.section-card]:[border-top-style:solid]", "tw:[&_.section-card_+_.section-card]:border-t-[color:#e2e9f3]",
    "tw:max-w-[1040px]", "tw:min-h-[calc(100dvh_-_48px)]", "tw:viewport-700:min-h-[calc(100dvh_-_24px)]", "tw:grid-rows-[auto_minmax(0,_1fr)]",
    "tw:[&_.assistant-chat]:min-h-[0]", "tw:[&_.assistant-chat]:h-[100%]",
  ].join(" "),
  "page_breadcrumb": sharedUtilities.pageBreadcrumb,
} as const;
