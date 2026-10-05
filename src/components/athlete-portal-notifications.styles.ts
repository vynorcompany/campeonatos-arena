/** Tailwind component utilities; marker classes only identify local state. */
const styles = {
  container: [
    "arena-notification-container tw:relative tw:w-[42px] tw:h-[42px]",
    "tw:viewport-700:w-[40px] tw:viewport-700:h-[40px]",
  ].join(" "),
  trigger: [
    "arena-notification-trigger tw:relative tw:grid tw:w-[100%]",
    "tw:h-[100%] tw:place-items-center tw:[border:1px_solid_rgb(129_211_235_/_.18)] tw:rounded-[11px]",
    "tw:[color:#eafff6] tw:[background:linear-gradient(145deg,_rgb(18_57_80_/_.72),_rgb(12_39_59_/_.72))] tw:[box-shadow:0_8px_18px_rgb(0_0_0_/_.13)] tw:cursor-pointer",
    "tw:[&:hover]:[background:linear-gradient(145deg,_rgb(25_72_98_/_.9),_rgb(14_48_70_/_.9))] tw:[&_svg]:w-[19px] tw:[&_svg]:h-[19px] tw:[&_svg]:[fill:#d8f7ff]",
    "tw:[&_svg]:[stroke:#d8f7ff] tw:[&_svg]:[stroke-linecap:round] tw:[&_svg]:[stroke-linejoin:round] tw:[&_svg]:[stroke-width:1.3]",
    "tw:[&_b]:absolute tw:[&_b]:top-[-5px] tw:[&_b]:right-[-5px] tw:[&_b]:min-w-[16px]",
    "tw:[&_b]:[padding:2px_4px] tw:[&_b]:[border:2px_solid_#123a56] tw:[&_b]:rounded-[999px] tw:[&_b]:[color:#fff]",
    "tw:[&_b]:[background:#e0544e] tw:[&_b]:text-[.57rem] tw:[&_b]:leading-[1] tw:[&_b.arena-notification-attention]:w-[auto]",
    "tw:[&_b.arena-notification-attention]:min-w-[18px] tw:[&_b.arena-notification-attention]:h-[18px] tw:[&_b.arena-notification-attention]:[padding:1px_5px] tw:[&_b.arena-notification-attention]:[color:#fff]",
    "tw:[&_b.arena-notification-attention]:[background:#dd3d45] tw:[&_b.arena-notification-attention]:[box-shadow:0_0_0_2px_rgb(221_61_69_/_.18)] tw:[&_b.arena-notification-attention]:text-[.72rem] tw:[&_b.arena-notification-attention]:leading-[1.45]",
    "tw:viewport-700:rounded-[10px] tw:viewport-700:[&_svg]:w-[18px] tw:viewport-700:[&_svg]:h-[18px]",
  ].join(" "),
  attention: [
    "arena-notification-attention",
  ].join(" "),
  modal: [
    "arena-notification-modal tw:absolute tw:z-[1001] tw:top-[calc(100%_+_9px)]",
    "tw:right-[0] tw:grid tw:w-[min(370px,_calc(100vw_-_28px))] tw:max-h-[min(530px,_calc(100vh_-_90px))]",
    "tw:overflow-auto tw:[border:1px_solid_#244a62] tw:rounded-[12px] tw:[color:#214963]",
    "tw:[background:#f9fcff] tw:[box-shadow:0_22px_54px_rgb(0_13_27_/_.44)] tw:[&_>_header]:flex tw:[&_>_header]:items-center",
    "tw:[&_>_header]:justify-between tw:[&_>_header]:gap-[12px] tw:[&_>_header]:[padding:12px_13px] tw:[&_>_header]:[border-bottom:1px_solid_#c9dce8]",
    "tw:[&_>_header]:[background:#103149] tw:[&_header_div]:grid tw:[&_header_div]:gap-[2px] tw:[&_header_strong]:[color:#fff]",
    "tw:[&_header_strong]:text-[.82rem] tw:[&_header_span]:[color:#c2d9e8] tw:[&_header_span]:text-[.68rem] tw:[&_header_>_button]:w-[25px]",
    "tw:[&_header_>_button]:h-[25px] tw:[&_header_>_button]:[border:0] tw:[&_header_>_button]:rounded-[6px] tw:[&_header_>_button]:[color:#fff]",
    "tw:[&_header_>_button]:[background:rgb(255_255_255_/_.16)] tw:[&_header_>_button]:text-[1.1rem] tw:[&_header_>_button]:cursor-pointer tw:[&_>_div]:grid",
    "tw:[&_a]:grid tw:[&_a]:grid-cols-[25px_minmax(0,_1fr)_auto] tw:[&_a]:items-center tw:[&_a]:gap-[8px]",
    "tw:[&_a]:[padding:10px_12px] tw:[&_a]:[border-bottom:1px_solid_#d7e5ed] tw:[&_a]:[color:inherit] tw:[&_a]:[background:#fff]",
    "tw:[&_a]:[text-decoration:none] tw:[&_a:hover]:[background:#eaf6f4] tw:[&_a_>_i]:grid tw:[&_a_>_i]:w-[24px]",
    "tw:[&_a_>_i]:h-[24px] tw:[&_a_>_i]:place-items-center tw:[&_a_>_i]:rounded-[50%] tw:[&_a_>_i]:[color:#177560]",
    "tw:[&_a_>_i]:[background:#e4f6ee] tw:[&_a_>_i]:text-[.62rem] tw:[&_a_>_i]:not-italic tw:[&_a_>_i]:[font-weight:900]",
    "tw:[&_a_>_i.arena-notification-finance]:[color:#1765a2] tw:[&_a_>_i.arena-notification-finance]:[background:#e7f1fd] tw:[&_a_>_i.arena-notification-finance]:text-[.54rem] tw:[&_a_>_i.arena-notification-arena]:[color:#9a6814]",
    "tw:[&_a_>_i.arena-notification-arena]:[background:#fff4d9] tw:[&_a_>_i.arena-notification-overdue]:[color:#a81720] tw:[&_a_>_i.arena-notification-overdue]:[background:#ffe2e3] tw:[&_a_>_span]:grid",
    "tw:[&_a_>_span]:min-w-[0] tw:[&_a_>_span]:gap-[2px] tw:[&_a_strong]:overflow-hidden tw:[&_a_strong]:[color:#123a56]",
    "tw:[&_a_strong]:text-[.74rem] tw:[&_a_strong]:text-ellipsis tw:[&_a_strong]:whitespace-nowrap tw:[&_a_small]:[display:-webkit-box]",
    "tw:[&_a_small]:overflow-hidden tw:[&_a_small]:[color:#45647a] tw:[&_a_small]:text-[.66rem] tw:[&_a_small]:leading-[1.35]",
    "tw:[&_a_small]:[-webkit-line-clamp:2] tw:[&_a_small]:[-webkit-box-orient:vertical] tw:[&_a_em]:[padding:4px_6px] tw:[&_a_em]:[border:1px_solid_#aac7d8]",
    "tw:[&_a_em]:rounded-[5px] tw:[&_a_em]:[color:#075c91] tw:[&_a_em]:[background:#f5fbff] tw:[&_a_em]:text-[.62rem]",
    "tw:[&_a_em]:not-italic tw:[&_a_em]:[font-weight:800] tw:[&_>_p]:[margin:0] tw:[&_>_p]:[padding:20px_13px]",
    "tw:[&_>_p]:[color:#34566e] tw:[&_>_p]:text-[.75rem] tw:viewport-700:right-[-2px]",
  ].join(" "),
  finance: [
    "arena-notification-finance",
  ].join(" "),
  arena: [
    "arena-notification-arena",
  ].join(" "),
  overdue: [
    "arena-notification-overdue",
  ].join(" "),
  tabs: [
    "arena-notification-tabs tw:flex tw:items-center tw:gap-[5px]",
    "tw:[padding:7px_10px] tw:[border-bottom:1px_solid_#cbdde8] tw:[background:#eaf3f8] tw:[&_>_button]:[border:0]",
    "tw:[&_>_button]:rounded-[6px] tw:[&_>_button]:[color:#365a71] tw:[&_>_button]:[background:transparent] tw:[&_>_button]:text-[.68rem]",
    "tw:[&_>_button]:[font-weight:800] tw:[&_>_button]:cursor-pointer tw:[&_>_button.arena-notification-active]:[color:#064e3b] tw:[&_>_button.arena-notification-active]:[background:#ccefe1]",
    "tw:[&_>_button:not(.arena-notification-readAll)]:[padding:6px_8px] tw:[&_b]:[margin-left:4px] tw:[&_b]:[padding:1px_4px] tw:[&_b]:rounded-[99px]",
    "tw:[&_b]:[color:#fff] tw:[&_b]:[background:#da4b4b] tw:[&_b]:text-[.58rem] tw:[&_>_.arena-notification-readAll]:[margin-left:auto]",
    "tw:[&_>_.arena-notification-readAll]:[padding:6px_4px] tw:[&_>_.arena-notification-readAll]:[color:#075c91] tw:[&_>_button:disabled]:cursor-wait tw:[&_>_button:disabled]:opacity-[.6]",
  ].join(" "),
  active: [
    "arena-notification-active",
  ].join(" "),
  readAll: [
    "arena-notification-readAll",
  ].join(" "),
} as const;

export default styles;
