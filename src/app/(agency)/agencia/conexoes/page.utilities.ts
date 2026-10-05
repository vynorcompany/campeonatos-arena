import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "page_header": sharedUtilities.pageHeader,
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "agency_connection_status": [
    "agency-connection-status", "tw:inline-flex", "tw:items-center", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]", "tw:text-[color:#9a6311]", "tw:text-[.68rem]", "tw:font-[800]",
    "tw:[&_i]:w-[7px]", "tw:[&_i]:h-[7px]", "tw:[&_i]:rounded-[50%]", "tw:[&_i]:bg-[color:#dca239]",
    "tw:[&_i]:[background-image:none]", "tw:[&.is-connected]:text-[color:#15704e]", "tw:[&.is-connected_i]:bg-[color:#1cab72]", "tw:[&.is-connected_i]:[background-image:none]",
  ].join(" "),
  "form_error": sharedUtilities.formError,
} as const;
