import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": sharedUtilities.stackMd,
  "grid_form": sharedUtilities.gridForm,
  "field": sharedUtilities.field,
  "field_form_full": sharedUtilities.fieldFormFull,
  "field_field_submit": sharedUtilities.fieldFieldSubmit,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "simple_list": sharedUtilities.simpleList,
  "simple_item": sharedUtilities.simpleItem,
  "plan_owner_tags": [
    "plan-owner-tags", "tw:flex", "tw:flex-wrap", "tw:gap-y-[4px]",
    "tw:gap-x-[4px]",
  ].join(" "),
  "plan_owner_tag": "plan-owner-tag tw:block tw:min-w-0 tw:break-words tw:text-xs! tw:font-normal tw:not-italic tw:text-[var(--muted)]!",
  "muted": sharedUtilities.muted,
} as const;
