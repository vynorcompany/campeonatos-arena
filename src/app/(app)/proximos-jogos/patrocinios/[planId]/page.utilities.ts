import { sharedUtilities as shared } from "@/components/ui/shared.utilities";
export const viewStyles = {
 sponsor_empty_state: "tw:grid tw:gap-2 tw:text-sm",
 button_button_small: shared.buttonButtonSmall,
 stack_md: "sponsorship-plan-workspace tw:grid tw:min-w-0 tw:gap-3",
 sponsorship_back: shared.buttonButtonSmall + " tw:justify-self-start",
 sponsorship_plan_hero: "tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3",
 eyebrow: shared.eyebrow,
 sponsorship_metrics: "sponsorship-metrics tw:flex tw:flex-wrap tw:gap-x-6 tw:gap-y-2 tw:border-y tw:border-[var(--line)] tw:py-3 tw:[&_article]:grid tw:[&_article]:gap-1 tw:[&_span]:text-[11px] tw:[&_span]:text-[var(--muted)] tw:[&_strong]:text-sm tw:[&_strong]:tabular-nums",
 section_card_sponsorship_companies_panel: "sponsorship-companies-panel tw:grid tw:gap-3 tw:[&_h2]:m-0 tw:[&_h2]:text-sm tw:[&_h2]:font-semibold tw:[&_p]:m-0 tw:[&_p]:text-xs",
 muted: "tw:text-xs tw:text-[var(--muted)]",
 sponsorship_company_directory: "sponsorship-company-directory tw:grid tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:[&>article]:flex tw:[&>article]:flex-wrap tw:[&>article]:items-center tw:[&>article]:justify-between tw:[&>article]:gap-3 tw:[&>article]:border-b tw:[&>article]:border-[var(--line)] tw:[&>article]:px-3 tw:[&>article]:py-2.5 tw:[&>article:last-child]:border-b-0 tw:[&>p]:p-3",
 sponsor_company_identity: "tw:flex tw:min-w-0 tw:items-center tw:gap-2 tw:[&>img]:size-8 tw:[&>img]:object-contain tw:[&>span]:grid tw:[&>span]:size-8 tw:[&>span]:shrink-0 tw:[&>span]:place-items-center tw:[&>span]:rounded-md tw:[&>span]:bg-[#174983] tw:[&>span]:text-white tw:[&>span]:text-xs tw:[&_strong]:block tw:[&_strong]:text-[13px] tw:[&_strong]:break-words tw:[&_small]:block tw:[&_small]:text-[11px] tw:[&_small]:text-[var(--muted)]",
 sponsorship_company_actions: "tw:flex tw:flex-wrap tw:gap-2",
 button_button_danger_button_small_sponsor_delete_button: shared.buttonButtonSmall + " tw:text-red-700!",
} as const;
