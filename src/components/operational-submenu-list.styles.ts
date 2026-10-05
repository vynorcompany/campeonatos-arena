/** Local Tailwind utilities for this component. */
const styles = {
  "list": [
    "arena-submenu-list", "tw:grid", "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]", "tw:border-r-[length:1px]",
    "tw:[border-right-style:solid]", "tw:border-r-[color:var(--line)]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]",
    "tw:border-b-[color:var(--line)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:var(--line)]",
    "tw:rounded-[12px]", "tw:viewport-620:rounded-[10px]", "tw:bg-[color:var(--panel)]", "tw:[background-image:none]",
    "tw:[box-shadow:var(--shadow-sm)]", "tw:[&.arena-submenu-list_>_a]:grid", "tw:[&.arena-submenu-list_>_a]:grid-cols-[34px_minmax(0,_1fr)_20px]", "tw:[&.arena-submenu-list_>_a]:gap-y-[12px]",
    "tw:[&.arena-submenu-list_>_a]:gap-x-[12px]", "tw:[&.arena-submenu-list_>_a]:items-center", "tw:[&.arena-submenu-list_>_a]:min-h-[64px]", "tw:viewport-620:[&.arena-submenu-list_>_a]:min-h-[58px]",
    "tw:[&.arena-submenu-list_>_a]:pt-[11px]", "tw:viewport-620:[&.arena-submenu-list_>_a]:pt-[9px]", "tw:[&.arena-submenu-list_>_a]:pr-[14px]", "tw:viewport-620:[&.arena-submenu-list_>_a]:pr-[11px]",
    "tw:[&.arena-submenu-list_>_a]:pb-[11px]", "tw:viewport-620:[&.arena-submenu-list_>_a]:pb-[9px]", "tw:[&.arena-submenu-list_>_a]:pl-[14px]", "tw:viewport-620:[&.arena-submenu-list_>_a]:pl-[11px]",
    "tw:[&.arena-submenu-list_>_a]:border-b-[length:1px]", "tw:[&.arena-submenu-list_>_a]:[border-bottom-style:solid]", "tw:[&.arena-submenu-list_>_a]:border-b-[color:var(--line)]", "tw:[&.arena-submenu-list_>_a]:text-[color:var(--ink)]",
    "tw:[&.arena-submenu-list_>_a]:[text-decoration:none]", "tw:[&.arena-submenu-list_>_a]:[transition:background_.16s_ease,_color_.16s_ease]", "tw:[&.arena-submenu-list_>_a:last-child]:border-b-[length:0]", "tw:[&.arena-submenu-list_>_a:last-child]:[border-bottom-style:none]",
    "tw:[&.arena-submenu-list_>_a:last-child]:border-b-[color:currentColor]", "tw:[&.arena-submenu-list_>_a:hover]:bg-[color:#f4f9fd]", "tw:[&.arena-submenu-list_>_a:hover]:[background-image:none]", "tw:[&.arena-submenu-list_strong]:text-[.82rem]",
    "tw:[&.arena-submenu-list_small]:[overflow-x:hidden]", "tw:[&.arena-submenu-list_small]:[overflow-y:hidden]", "tw:[&.arena-submenu-list_small]:text-[color:var(--muted)]", "tw:[&.arena-submenu-list_small]:text-[.72rem]",
    "tw:viewport-620:[&.arena-submenu-list_small]:text-[.68rem]", "tw:[&.arena-submenu-list_small]:text-ellipsis", "tw:[&.arena-submenu-list_small]:whitespace-nowrap",
  ].join(" "),
  "copy": [
    "arena-submenu-copy", "tw:grid", "tw:gap-y-[3px]", "tw:gap-x-[3px]",
    "tw:min-w-[0]",
  ].join(" "),
  "icon": [
    "arena-submenu-icon", "tw:grid", "tw:w-[32px]", "tw:h-[32px]",
    "tw:place-items-center", "tw:rounded-[8px]", "tw:text-[color:var(--primary)]", "tw:bg-[color:#eaf3ff]",
    "tw:[background-image:none]", "tw:[&.arena-submenu-icon_svg]:w-[18px]", "tw:[&.arena-submenu-icon_svg]:h-[18px]", "tw:[&.arena-submenu-icon_svg]:[fill:none]",
    "tw:[&.arena-submenu-icon_svg]:[stroke:currentColor]", "tw:[&.arena-submenu-icon_svg]:[stroke-linecap:round]", "tw:[&.arena-submenu-icon_svg]:[stroke-linejoin:round]", "tw:[&.arena-submenu-icon_svg]:[stroke-width:1.8]",
  ].join(" "),
  "arrow": [
    "arena-submenu-arrow", "tw:w-[18px]", "tw:h-[18px]", "tw:[fill:none]",
    "tw:[stroke:currentColor]", "tw:[stroke-linecap:round]", "tw:[stroke-linejoin:round]", "tw:[stroke-width:1.8]",
    "tw:text-[color:#5c7b91]",
  ].join(" "),
} as const;
export default styles;
