/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "dashboard_grid_dashboard_chart_grid_dashboard_sortable_grid": "dashboard-grid dashboard-chart-grid dashboard-sortable-grid tw:grid tw:min-w-0 tw:grid-cols-3 tw:items-start tw:gap-3 tw:viewport-1180:grid-cols-2 tw:viewport-760:grid-cols-1",
  "dashboard_sortable_panel": [
    "dashboard-sortable-panel", "tw:relative", "tw:min-w-[0]", "tw:[align-self:start]",
    "tw:[&_>_.card]:h-auto", "tw:[&_>_.card]:min-h-[inherit]", "tw:[&_>_.card]:content-start", "tw:[&_>_.card_>_div:first-child]:pr-12", "tw:[&.is-dragging]:opacity-[.45]", "tw:[&:hover_.dashboard-drag-handle]:text-[color:var(--brand)]",
    "tw:[&:hover_.dashboard-panel-resize-handle]:opacity-[1]",
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
