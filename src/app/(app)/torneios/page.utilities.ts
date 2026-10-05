import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": "stack-md tournaments-page tw:grid tw:min-w-0 tw:gap-4 tw:[&_.card]:rounded-xl tw:[&_.card]:border tw:[&_.card]:border-solid tw:[&_.card]:border-[var(--line)] tw:[&_.card]:bg-white tw:[&_.card]:p-4 tw:[&_.card]:shadow-[var(--shadow)]",
  "page_header": "page-header tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3 tw:pb-3 tw:border-0 tw:border-b tw:border-solid tw:border-[var(--line)] tw:[&_h1]:text-[1.5rem] tw:[&_h1]:font-semibold",
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
  "t_event_row": "t-event-row tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] tw:items-start tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-[var(--line)] tw:py-4 tw:last:border-b-0 tw:viewport-1120:grid-cols-[minmax(0,1fr)_auto] tw:viewport-620:grid-cols-1",
  "t_event_identity": "t-event-identity tw:grid tw:min-w-0 tw:gap-2 tw:[overflow-wrap:anywhere] tw:[&_h3]:m-0 tw:[&_h3]:text-base tw:[&_p]:m-0 tw:[&_p]:text-sm tw:[&_p]:text-[var(--muted)]",
  "t_event_categories": [
    "t-event-categories", "tw:flex", "tw:flex-wrap", "tw:gap-y-[6px]",
    "tw:gap-x-[10px]",
  ].join(" "),
  "t_event_category": [
    "t-event-category", "tw:text-[color:var(--muted)]", "tw:text-[0.86rem]",
  ].join(" "),
  "t_event_metadata": "t-event-metadata tw:grid tw:justify-items-start tw:min-w-0 tw:gap-2 tw:text-xs tw:text-[var(--muted)] tw:viewport-1120:col-start-1 tw:viewport-1120:row-start-2 tw:[&_dl]:m-0 tw:[&_dl]:flex tw:[&_dl]:flex-wrap tw:[&_dl]:gap-x-4 tw:[&_dl]:gap-y-2 tw:[&_dd]:m-0 tw:[&_dd]:font-semibold tw:[&_dd]:text-[var(--text)]",
  "t_event_action": "t-event-action tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:viewport-1120:col-start-2 tw:viewport-1120:row-span-2 tw:viewport-620:col-start-1 tw:viewport-620:row-start-3 tw:viewport-620:row-span-1",
  "button_button_danger": sharedUtilities.buttonButtonDanger,
  "t_event_list_2": [
    "t-event-list", "t-event-list-history", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:var(--line)]",
  ].join(" "),
  "t_event_row_t_event_row_history": "t-event-row t-event-row-history tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] tw:items-center tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-[var(--line)] tw:py-3 tw:last:border-b-0 tw:viewport-1120:grid-cols-[minmax(0,1fr)_auto] tw:viewport-620:grid-cols-1",
} as const;
