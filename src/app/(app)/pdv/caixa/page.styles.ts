/** Tailwind component utilities; marker classes only identify local state. */
const styles = {
  page: [
    "arena-cash-page tw:grid tw:gap-[20px] tw:w-[100%]",
    "tw:max-w-[1320px] tw:[padding-bottom:32px] tw:viewport-480:gap-[14px]",
  ].join(" "),
  overview: [
    "arena-cash-overview tw:flex tw:items-end tw:justify-between",
    "tw:gap-[24px] tw:[padding:16px_0_21px] tw:[border-bottom:1px_solid_var(--line)] tw:viewport-680:items-start",
    "tw:viewport-680:flex-col tw:viewport-680:gap-[14px]",
  ].join(" "),
  overviewCopy: [
    "arena-cash-overviewCopy tw:grid tw:gap-[7px] tw:min-w-[0]",
    "tw:[&_p]:[margin:0] tw:[&_p]:[color:#63778d] tw:[&_p]:text-[.83rem] tw:[&_p]:leading-[1.45]",
  ].join(" "),
  eyebrow: [
    "arena-cash-eyebrow tw:[color:var(--brand)] tw:text-[.68rem] tw:[font-weight:800]",
    "tw:tracking-[.12em] tw:uppercase",
  ].join(" "),
  overviewTitle: [
    "arena-cash-overviewTitle tw:flex tw:items-center tw:flex-wrap",
    "tw:gap-[12px] tw:[&_h2]:[margin:0] tw:[&_h2]:[color:#102b50] tw:[&_h2]:text-[clamp(1.35rem,_2vw,_1.75rem)]",
    "tw:[&_h2]:leading-[1.2] tw:[&_h2]:tracking-[-.03em]",
  ].join(" "),
  shortcuts: [
    "arena-cash-shortcuts tw:flex tw:flex-wrap tw:items-center",
    "tw:gap-[8px] tw:[&_a]:whitespace-nowrap tw:viewport-680:w-[100%] tw:viewport-680:[&_>_a]:[flex:1_1_170px]",
    "tw:viewport-680:[&_>_a]:text-center",
  ].join(" "),
  status: [
    "arena-cash-status tw:inline-flex tw:items-center tw:gap-[6px]",
    "tw:w-[fit-content] tw:min-h-[28px] tw:[padding:4px_9px] tw:[border-width:1px]",
    "tw:[border-style:solid] tw:rounded-[6px] tw:text-[.74rem] tw:[font-weight:700]",
    "tw:leading-[1.2] tw:[&_>_span]:w-[6px] tw:[&_>_span]:h-[6px] tw:[&_>_span]:[flex:0_0_6px]",
    "tw:[&_>_span]:rounded-[50%] tw:[&_>_span]:[background:currentColor]",
  ].join(" "),
  open: [
    "arena-cash-open tw:[border-color:#bce7cd] tw:[color:#147345] tw:[background:#edf9f1]",
  ].join(" "),
  closed: [
    "arena-cash-closed tw:[border-color:#f0c5c5] tw:[color:#b73939] tw:[background:#fff3f3]",
  ].join(" "),
  notOpened: [
    "arena-cash-notOpened tw:[border-color:#ebd5a1] tw:[color:#8a651a] tw:[background:#fff8e8]",
  ].join(" "),
  summaryGrid: [
    "arena-cash-summaryGrid tw:grid tw:grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] tw:gap-[12px]",
    "tw:[&_article]:grid tw:[&_article]:[align-content:center] tw:[&_article]:gap-[8px] tw:[&_article]:min-w-[0]",
    "tw:[&_article]:min-h-[94px] tw:[&_article]:[padding:16px_18px] tw:[&_article]:[border:1px_solid_#dce7f1] tw:[&_article]:rounded-[11px]",
    "tw:[&_article]:[background:#f9fbfe] tw:[&_span]:[color:#60758a] tw:[&_span]:text-[.74rem] tw:[&_strong]:[color:#14365d]",
    "tw:[&_strong]:text-[clamp(1rem,_1.5vw,_1.26rem)] tw:[&_strong]:[font-variant-numeric:tabular-nums] tw:[&_strong]:[overflow-wrap:anywhere] tw:viewport-480:grid-cols-[repeat(2,_minmax(0,_1fr))]",
    "tw:viewport-480:gap-[8px] tw:viewport-480:[&_article]:min-h-[82px] tw:viewport-480:[&_article]:[padding:12px] tw:viewport-480:[&_strong]:text-[.93rem]",
  ].join(" "),
  operationGrid: [
    "arena-cash-operationGrid tw:grid tw:grid-cols-[repeat(2,_minmax(0,_1fr))] tw:items-stretch",
    "tw:gap-[16px] tw:viewport-1000:grid-cols-[1fr]",
  ].join(" "),
  panel: [
    "arena-cash-panel tw:grid tw:[align-content:start] tw:gap-[18px]",
    "tw:min-w-[0] tw:[padding:22px] tw:[border:1px_solid_#dce7f1] tw:rounded-[12px]",
    "tw:[background:#fff] tw:[box-shadow:0_6px_18px_rgb(19_48_83_/_.04)] tw:[&_h2]:[margin:0] tw:[&_h2]:[color:#17385f]",
    "tw:[&_h2]:text-[1rem] tw:[&_p]:leading-[1.45] tw:viewport-680:[padding:17px]",
  ].join(" "),
  form: [
    "arena-cash-form tw:grid tw:grid-cols-[repeat(2,_minmax(0,_1fr))] tw:[align-items:end]",
    "tw:gap-[14px] tw:min-w-[0] tw:[&_>_label]:min-w-[0] tw:[&_>_label_:is(input,_select)]:w-[100%]",
    "tw:[&_>_label_:is(input,_select)]:min-w-[0] tw:viewport-480:grid-cols-[1fr]",
  ].join(" "),
  fullWidth: [
    "arena-cash-fullWidth tw:[grid-column:1_/_-1] tw:viewport-480:[grid-column:1]",
  ].join(" "),
  formActions: [
    "arena-cash-formActions tw:[grid-column:1_/_-1] tw:flex tw:justify-end",
    "tw:[padding-top:4px] tw:viewport-480:[grid-column:1] tw:viewport-480:[&_>_button]:w-[100%]",
  ].join(" "),
  currencyInput: [
    "arena-cash-currencyInput tw:flex tw:items-stretch tw:w-[100%]",
    "tw:min-w-[0] tw:[border:1px_solid_#cbdbe9] tw:rounded-[7px] tw:[background:#fff]",
    "tw:[&:focus-within]:[outline:2px_solid_#acd1f4] tw:[&:focus-within]:[border-color:#3175b7] tw:[&_>_span]:grid tw:[&_>_span]:place-items-center",
    "tw:[&_>_span]:[flex:0_0_42px] tw:[&_>_span]:[background:#f3f7fb] tw:[&_>_span]:[border-right:1px_solid_#d8e4ee] tw:[&_>_span]:rounded-[6px_0_0_6px]",
    "tw:[&_>_span]:[color:#536f88] tw:[&_>_span]:text-[.81rem] tw:[&_>_span]:[font-weight:700] tw:[&_input]:w-[100%]",
    "tw:[&_input]:min-w-[0] tw:[&_input]:[border:0] tw:[&_input]:rounded-[0_6px_6px_0] tw:[&_input]:[box-shadow:none]",
    "tw:[&_input:focus]:[outline:0] tw:[&_input:focus]:[box-shadow:none]",
  ].join(" "),
  movementList: [
    "arena-cash-movementList tw:grid tw:[&_article]:flex tw:[&_article]:justify-between",
    "tw:[&_article]:items-center tw:[&_article]:gap-[14px] tw:[&_article]:[padding:13px_0] tw:[&_article]:[border-bottom:1px_solid_#e6eef5]",
    "tw:[&_article:last-child]:[border-bottom:0] tw:[&_article_>_span]:grid tw:[&_article_>_span]:gap-[4px] tw:[&_article_>_span]:min-w-[0]",
    "tw:[&_strong]:[color:#17385f] tw:[&_strong]:text-[.84rem] tw:[&_small]:[color:#667e93] tw:[&_small]:text-[.74rem]",
    "tw:[&_small]:[overflow-wrap:anywhere] tw:[&_b]:[flex:0_0_auto] tw:[&_b]:text-[.85rem] tw:[&_b]:[font-variant-numeric:tabular-nums]",
  ].join(" "),
  positive: [
    "arena-cash-positive tw:[color:#087c50]",
  ].join(" "),
  negative: [
    "arena-cash-negative tw:[color:#b5362e]",
  ].join(" "),
} as const;

export default styles;
