import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "athlete_create_panel": [
    "athlete-create-panel", "tw:grid", "tw:[justify-items:end]", "tw:gap-y-[12px]",
    "tw:gap-x-[12px]", "tw:[&_>_div]:w-[min(100%,_760px)]", "tw:[&_.grid-form]:pt-[18px]", "tw:[&_.grid-form]:pr-[18px]",
    "tw:[&_.grid-form]:pb-[18px]", "tw:[&_.grid-form]:pl-[18px]", "tw:[&_.grid-form]:border-t-[length:1px]", "tw:[&_.grid-form]:[border-top-style:solid]",
    "tw:[&_.grid-form]:border-t-[color:var(--line)]", "tw:[&_.grid-form]:border-r-[length:1px]", "tw:[&_.grid-form]:[border-right-style:solid]", "tw:[&_.grid-form]:border-r-[color:var(--line)]",
    "tw:[&_.grid-form]:border-b-[length:1px]", "tw:[&_.grid-form]:[border-bottom-style:solid]", "tw:[&_.grid-form]:border-b-[color:var(--line)]", "tw:[&_.grid-form]:border-l-[length:1px]",
    "tw:[&_.grid-form]:[border-left-style:solid]", "tw:[&_.grid-form]:border-l-[color:var(--line)]", "tw:[&_.grid-form]:rounded-[16px]", "tw:[&_.grid-form]:bg-[color:var(--panel)]",
    "tw:[&_.grid-form]:[background-image:none]", "tw:[&_.client-create-form]:w-[100%]", "tw:[&_.client-create-form]:mt-[12px]", "tw:[&_.client-create-form]:pt-[16px]",
    "tw:[&_.client-create-form]:pr-[16px]", "tw:[&_.client-create-form]:pb-[16px]", "tw:[&_.client-create-form]:pl-[16px]", "tw:[&_.client-create-form]:border-t-[length:1px]",
    "tw:[&_.client-create-form]:[border-top-style:solid]", "tw:[&_.client-create-form]:border-t-[color:var(--line)]", "tw:[&_.client-create-form]:border-r-[length:1px]", "tw:[&_.client-create-form]:[border-right-style:solid]",
    "tw:[&_.client-create-form]:border-r-[color:var(--line)]", "tw:[&_.client-create-form]:border-b-[length:1px]", "tw:[&_.client-create-form]:[border-bottom-style:solid]", "tw:[&_.client-create-form]:border-b-[color:var(--line)]",
    "tw:[&_.client-create-form]:border-l-[length:1px]", "tw:[&_.client-create-form]:[border-left-style:solid]", "tw:[&_.client-create-form]:border-l-[color:var(--line)]", "tw:[&_.client-create-form]:rounded-[9px]",
    "tw:[&_.client-create-form]:bg-[color:var(--panel)]", "tw:[&_.client-create-form]:[background-image:none]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
} as const;
