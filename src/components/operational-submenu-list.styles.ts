/** Tailwind component utilities; marker classes only identify local state. */
const styles = {
  list: [
    "arena-submenu-list tw:grid tw:overflow-hidden tw:[border:1px_solid_var(--line)]",
    "tw:rounded-[12px] tw:[background:var(--panel)] tw:[box-shadow:var(--shadow-sm)] tw:[&_>_a]:grid",
    "tw:[&_>_a]:grid-cols-[34px_minmax(0,_1fr)_20px] tw:[&_>_a]:gap-[12px] tw:[&_>_a]:items-center tw:[&_>_a]:min-h-[64px]",
    "tw:[&_>_a]:[padding:11px_14px] tw:[&_>_a]:[border-bottom:1px_solid_var(--line)] tw:[&_>_a]:[color:var(--ink)] tw:[&_>_a]:[text-decoration:none]",
    "tw:[&_>_a]:[transition:background_.16s_ease,_color_.16s_ease] tw:[&_>_a:last-child]:[border-bottom:0] tw:[&_>_a:hover]:[background:#f4f9fd] tw:[&_strong]:text-[.82rem]",
    "tw:[&_small]:overflow-hidden tw:[&_small]:[color:var(--muted)] tw:[&_small]:text-[.72rem] tw:[&_small]:text-ellipsis",
    "tw:[&_small]:whitespace-nowrap tw:viewport-620:rounded-[10px] tw:viewport-620:[&_>_a]:min-h-[58px] tw:viewport-620:[&_>_a]:[padding:9px_11px]",
    "tw:viewport-620:[&_small]:text-[.68rem]",
  ].join(" "),
  copy: [
    "arena-submenu-copy tw:grid tw:gap-[3px] tw:min-w-[0]",
  ].join(" "),
  icon: [
    "arena-submenu-icon tw:grid tw:w-[32px] tw:h-[32px]",
    "tw:place-items-center tw:rounded-[8px] tw:[color:var(--primary)] tw:[background:#eaf3ff]",
    "tw:[&_svg]:w-[18px] tw:[&_svg]:h-[18px] tw:[&_svg]:[fill:none] tw:[&_svg]:[stroke:currentColor]",
    "tw:[&_svg]:[stroke-linecap:round] tw:[&_svg]:[stroke-linejoin:round] tw:[&_svg]:[stroke-width:1.8]",
  ].join(" "),
  arrow: [
    "arena-submenu-arrow tw:w-[18px] tw:h-[18px] tw:[fill:none]",
    "tw:[stroke:currentColor] tw:[stroke-linecap:round] tw:[stroke-linejoin:round] tw:[stroke-width:1.8]",
    "tw:[color:#5c7b91]",
  ].join(" "),
} as const;

export default styles;
