import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "section_card": sharedUtilities.sectionCard,
  "eyebrow": sharedUtilities.eyebrow,
  "league_medical_admin_row": [
    "league-medical-admin-row", "tw:flex", "tw:justify-between", "tw:gap-y-[18px]",
    "tw:gap-x-[18px]", "tw:pt-[12px]", "tw:pr-[0]", "tw:pb-[12px]",
    "tw:pl-[0]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:[&_>_div]:grid", "tw:[&_>_div]:gap-y-[6px]", "tw:[&_>_div]:gap-x-[6px]", "tw:[&_form]:grid",
    "tw:[&_form]:gap-y-[6px]", "tw:[&_form]:gap-x-[6px]", "tw:[&_form]:min-w-[min(100%,_340px)]", "tw:[&_p]:mt-[0]",
    "tw:[&_p]:mr-[0]", "tw:[&_p]:mb-[0]", "tw:[&_p]:ml-[0]", "tw:[&_p]:text-[color:var(--muted)]",
    "tw:[&_p]:text-[.82rem]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "button_button_danger": sharedUtilities.buttonButtonDanger,
} as const;
