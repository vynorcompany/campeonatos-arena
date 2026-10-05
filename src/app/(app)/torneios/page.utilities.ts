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
  "section_actions": sharedUtilities.sectionActions,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "button": sharedUtilities.button,
  "t_event_list": [
    "t-event-list", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
  ].join(" "),
  "t_event_row": [
    "t-event-row", "tw:grid", "tw:grid-cols-[minmax(0,_1.15fr)_minmax(22rem,_1fr)_auto]", "tw:viewport-1120:grid-cols-[minmax(0,_1fr)_auto]",
    "tw:gap-y-[24px]", "tw:viewport-1120:gap-y-[14px]", "tw:gap-x-[24px]", "tw:viewport-1120:gap-x-[18px]",
    "tw:items-center", "tw:pt-[20px]", "tw:pr-[0]", "tw:pb-[20px]",
    "tw:pl-[0]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:rgba(216,_224,_234,_0.78)]",
  ].join(" "),
  "t_event_identity": [
    "t-event-identity", "tw:min-w-[0]", "tw:grid", "tw:gap-y-[10px]",
    "tw:gap-x-[10px]", "tw:[&_h3]:mt-[0]", "tw:[&_h3]:mr-[0]", "tw:[&_h3]:mb-[0]",
    "tw:[&_h3]:ml-[0]", "tw:[&_h3]:tracking-[-0.02em]", "tw:[&_p]:mt-[0]", "tw:[&_p]:mr-[0]",
    "tw:[&_p]:mb-[0]", "tw:[&_p]:ml-[0]", "tw:[&_p]:text-[color:var(--muted)]",
  ].join(" "),
  "t_event_categories": [
    "t-event-categories", "tw:flex", "tw:flex-wrap", "tw:gap-y-[6px]",
    "tw:gap-x-[10px]",
  ].join(" "),
  "t_event_category": [
    "t-event-category", "tw:text-[color:var(--muted)]", "tw:text-[0.86rem]",
  ].join(" "),
  "t_event_metadata": [
    "t-event-metadata", "tw:min-w-[0]", "tw:text-[color:var(--muted)]", "tw:grid",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]", "tw:[&_dl]:grid", "tw:[&_dl]:grid-cols-[repeat(3,_minmax(0,_1fr))]",
    "tw:viewport-680:[&_dl]:grid-cols-[1fr]", "tw:[&_dl]:gap-y-[10px]", "tw:[&_dl]:gap-x-[10px]", "tw:[&_dl]:mt-[0]",
    "tw:[&_dl]:mr-[0]", "tw:[&_dl]:mb-[0]", "tw:[&_dl]:ml-[0]", "tw:[&_dt]:text-[0.72rem]",
    "tw:[&_dt]:font-[700]", "tw:[&_dt]:tracking-[0.04em]", "tw:[&_dt]:uppercase", "tw:[&_dd]:mt-[3px]",
    "tw:[&_dd]:mr-[0]", "tw:[&_dd]:mb-[0]", "tw:[&_dd]:ml-[0]", "tw:[&_dd]:text-[color:var(--text)]",
    "tw:[&_dd]:text-[0.9rem]", "tw:[&_dd]:font-[700]", "tw:viewport-1120:[grid-column:1_/_-1]",
  ].join(" "),
  "t_event_action": [
    "t-event-action", "tw:min-w-[0]", "tw:flex", "tw:justify-end",
    "tw:items-center", "tw:gap-y-[8px]", "tw:gap-x-[8px]", "tw:viewport-1120:[grid-column:2]",
    "tw:viewport-1120:[grid-row:1]",
  ].join(" "),
  "button_button_danger": sharedUtilities.buttonButtonDanger,
  "t_event_list_2": [
    "t-event-list", "t-event-list-history", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:var(--line)]",
  ].join(" "),
  "t_event_row_t_event_row_history": [
    "t-event-row", "t-event-row-history", "tw:grid", "tw:grid-cols-[minmax(0,_1.15fr)_minmax(22rem,_1fr)_auto]",
    "tw:viewport-1120:grid-cols-[minmax(0,_1fr)_auto]", "tw:gap-y-[24px]", "tw:viewport-1120:gap-y-[14px]", "tw:gap-x-[24px]",
    "tw:viewport-1120:gap-x-[18px]", "tw:items-center", "tw:pt-[20px]", "tw:pr-[0]",
    "tw:pb-[20px]", "tw:pl-[0]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:rgba(216,_224,_234,_0.78)]", "tw:bg-[color:var(--panel-muted)]", "tw:[background-image:none]",
  ].join(" "),
} as const;
