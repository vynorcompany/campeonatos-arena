import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "stack_md": "stack-md tournaments-page tw:grid tw:w-full tw:min-w-0 tw:gap-4 tw:pb-4",
  "page_breadcrumb": sharedUtilities.pageBreadcrumb,
  "event_section": "tw:grid tw:min-w-0 tw:gap-2 tw:[&_h2]:m-0 tw:[&_h2]:flex tw:[&_h2]:items-center tw:[&_h2]:gap-2 tw:[&_h2]:text-sm tw:[&_h2]:font-semibold tw:[&_h2_>_span]:rounded-full tw:[&_h2_>_span]:bg-[var(--panel-muted)] tw:[&_h2_>_span]:px-2 tw:[&_h2_>_span]:py-0.5 tw:[&_h2_>_span]:text-xs tw:[&_h2_>_span]:text-[var(--muted)]",
  "empty_history": "tw:m-0 tw:rounded-xl tw:border tw:border-solid tw:border-[var(--line)] tw:bg-white tw:p-4 tw:text-sm tw:text-[var(--muted)]",
  "page_header": "page-header tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:[&_h1]:m-0 tw:[&_h1]:text-[1.5rem] tw:[&_h1]:font-semibold tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:line-clamp-2",
  "stack_xs": [
    "stack-xs", "tw:grid", "tw:gap-y-[6px]", "tw:gap-x-[6px]",
  ].join(" "),
  "eyebrow": sharedUtilities.eyebrow,
  "muted": sharedUtilities.muted,
  "section_actions": sharedUtilities.sectionActions,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "button": sharedUtilities.button,
  "t_event_list": "t-event-list tw:grid tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-[var(--line)] tw:bg-white tw:shadow-[var(--shadow-sm)]",
  "t_event_row": "t-event-row tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] tw:items-center tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-[var(--line)] tw:px-4 tw:py-3 tw:last:border-b-0 tw:viewport-1120:grid-cols-[minmax(0,1fr)_auto] tw:viewport-620:grid-cols-1",
  "t_event_identity": "t-event-identity tw:grid tw:min-w-0 tw:gap-2 tw:[overflow-wrap:anywhere] tw:[&_h3]:m-0 tw:[&_h3]:text-sm tw:[&_h3]:font-semibold tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:line-clamp-2 tw:[&_p]:text-[var(--muted)]",
  "t_event_categories": [
    "t-event-categories", "tw:flex", "tw:flex-wrap", "tw:gap-y-[6px]",
    "tw:gap-x-[10px]",
  ].join(" "),
  "t_event_category": [
    "t-event-category", "tw:text-[color:var(--muted)]", "tw:text-xs",
  ].join(" "),
  "t_event_metadata": "t-event-metadata tw:grid tw:justify-items-start tw:min-w-0 tw:gap-2 tw:text-xs tw:text-[var(--muted)] tw:viewport-1120:col-start-1 tw:viewport-1120:row-start-2 tw:[&_dl]:m-0 tw:[&_dl]:flex tw:[&_dl]:flex-wrap tw:[&_dl]:gap-x-4 tw:[&_dl]:gap-y-2 tw:[&_.pill]:text-[11px] tw:[&_dd]:m-0 tw:[&_dd]:font-semibold tw:[&_dd]:text-[var(--text)]",
  "t_event_action": "t-event-action tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:viewport-1120:col-start-2 tw:viewport-1120:row-span-2 tw:viewport-620:col-start-1 tw:viewport-620:row-start-3 tw:viewport-620:row-span-1",
  "button_button_danger": sharedUtilities.buttonButtonDanger,
  "t_event_list_2": "t-event-list t-event-list-history tw:grid tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-[var(--line)] tw:bg-white tw:shadow-[var(--shadow-sm)]",
  "t_event_row_t_event_row_history": "t-event-row t-event-row-history tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] tw:items-center tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-[var(--line)] tw:px-4 tw:py-3 tw:last:border-b-0 tw:viewport-1120:grid-cols-[minmax(0,1fr)_auto] tw:viewport-620:grid-cols-1",
} as const;
