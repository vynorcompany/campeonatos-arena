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
  "simple_list": sharedUtilities.simpleList,
  "simple_item": sharedUtilities.simpleItem,
} as const;
