/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "dashboard_grid_dashboard_chart_grid_dashboard_sortable_grid": [
    "dashboard-grid", "dashboard-chart-grid", "dashboard-sortable-grid", "tw:grid",
    "tw:gap-y-[18px]", "tw:gap-x-[18px]", "tw:grid-cols-[repeat(3,_minmax(0,_1fr))]", "tw:viewport-900:grid-cols-[repeat(2,_minmax(0,_1fr))]",
    "tw:viewport-620:grid-cols-[1fr]", "tw:[&_>_*:nth-child(1)]:[animation-delay:40ms]", "tw:[&_>_*:nth-child(2)]:[animation-delay:100ms]", "tw:[&_>_*:nth-child(3)]:[animation-delay:160ms]",
    "tw:[&_>_*:nth-child(4)]:[animation-delay:220ms]", "tw:[align-items:start]", "tw:[grid-auto-flow:row_dense]",
  ].join(" "),
  "dashboard_sortable_panel": [
    "dashboard-sortable-panel", "tw:relative", "tw:min-w-[0]", "tw:[align-self:start]",
    "tw:[&_>_.section-card]:h-[auto]", "tw:[&_>_.section-card]:min-h-[inherit]", "tw:[&.is-dragging]:opacity-[.45]", "tw:[&:hover_.dashboard-drag-handle]:text-[color:var(--brand)]",
    "tw:[&:hover_.dashboard-panel-resize-handle]:opacity-[1]", "tw:viewport-900:[grid-column:span_1]!",
  ].join(" "),
  "dashboard_drag_handle": [
    "dashboard-drag-handle", "tw:absolute", "tw:z-[5]", "tw:top-[11px]",
    "tw:right-[12px]", "tw:text-[color:#7c93aa]", "tw:text-[1rem]", "tw:tracking-[-2px]",
    "tw:cursor-grab", "tw:[&:active]:cursor-grabbing",
  ].join(" "),
  "dashboard_panel_resize_handle_dashboard_panel_resize_handle_right": [
    "dashboard-panel-resize-handle", "dashboard-panel-resize-handle-right", "tw:absolute", "tw:z-[4]",
    "tw:opacity-[0]", "tw:viewport-620:opacity-[1]", "tw:[transition:opacity_.15s_ease,_background_.15s_ease]", "tw:[touch-action:none]",
    "tw:focus:opacity-[1]", "tw:hover:bg-[color:rgb(33_121_194_/_.1)]", "tw:hover:[background-image:none]", "tw:top-[12px]",
    "tw:right-[0]", "tw:bottom-[12px]", "tw:w-[12px]", "tw:border-r-[length:2px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--brand)]", "tw:[cursor:ew-resize]",
  ].join(" "),
  "dashboard_panel_resize_handle_dashboard_panel_resize_handle_bottom": [
    "dashboard-panel-resize-handle", "dashboard-panel-resize-handle-bottom", "tw:absolute", "tw:z-[4]",
    "tw:opacity-[0]", "tw:viewport-620:opacity-[1]", "tw:[transition:opacity_.15s_ease,_background_.15s_ease]", "tw:[touch-action:none]",
    "tw:focus:opacity-[1]", "tw:hover:bg-[color:rgb(33_121_194_/_.1)]", "tw:hover:[background-image:none]", "tw:right-[12px]",
    "tw:bottom-[0]", "tw:left-[12px]", "tw:h-[12px]", "tw:border-b-[length:2px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--brand)]", "tw:[cursor:ns-resize]",
  ].join(" "),
} as const;
