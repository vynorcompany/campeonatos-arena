/** Local Tailwind utilities for this component. */
const styles = {
  "page": [
    "arena-cash-page", "tw:grid", "tw:gap-y-[20px]", "tw:viewport-480:gap-y-[14px]",
    "tw:gap-x-[20px]", "tw:viewport-480:gap-x-[14px]", "tw:w-[100%]", "tw:max-w-[1320px]",
    "tw:pb-[32px]",
  ].join(" "),
  "overview": "arena-cash-overview tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:py-1 tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:text-[var(--muted)]",
  "overviewCopy": [
    "arena-cash-overviewCopy", "tw:grid", "tw:gap-y-[7px]", "tw:gap-x-[7px]",
    "tw:min-w-[0]", "tw:[&.arena-cash-overviewCopy_p]:mt-[0]", "tw:[&.arena-cash-overviewCopy_p]:mr-[0]", "tw:[&.arena-cash-overviewCopy_p]:mb-[0]",
    "tw:[&.arena-cash-overviewCopy_p]:ml-[0]", "tw:[&.arena-cash-overviewCopy_p]:text-[color:#63778d]", "tw:[&.arena-cash-overviewCopy_p]:text-[.83rem]", "tw:[&.arena-cash-overviewCopy_p]:leading-[1.45]",
  ].join(" "),
  "eyebrow": [
    "arena-cash-eyebrow", "tw:text-[color:var(--brand)]", "tw:text-[.68rem]", "tw:font-[800]",
    "tw:tracking-[.12em]", "tw:uppercase",
  ].join(" "),
  "overviewTitle": [
    "arena-cash-overviewTitle", "tw:flex", "tw:items-center", "tw:flex-wrap",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]", "tw:[&.arena-cash-overviewTitle_h2]:mt-[0]", "tw:[&.arena-cash-overviewTitle_h2]:mr-[0]",
    "tw:[&.arena-cash-overviewTitle_h2]:mb-[0]", "tw:[&.arena-cash-overviewTitle_h2]:ml-[0]", "tw:[&.arena-cash-overviewTitle_h2]:text-[color:#102b50]", "tw:[&.arena-cash-overviewTitle_h2]:text-[clamp(1.35rem,_2vw,_1.75rem)]",
    "tw:[&.arena-cash-overviewTitle_h2]:leading-[1.2]", "tw:[&.arena-cash-overviewTitle_h2]:tracking-[-.03em]",
  ].join(" "),
  "shortcuts": [
    "arena-cash-shortcuts", "tw:flex", "tw:flex-wrap", "tw:items-center",
    "tw:gap-y-[8px]", "tw:gap-x-[8px]", "tw:[&.arena-cash-shortcuts_a]:whitespace-nowrap", "tw:viewport-680:w-[100%]",
    "tw:viewport-680:[&.arena-cash-shortcuts_>_a]:[flex:1_1_170px]", "tw:viewport-680:[&.arena-cash-shortcuts_>_a]:text-center",
  ].join(" "),
  "status": [
    "arena-cash-status", "tw:inline-flex", "tw:items-center", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]", "tw:w-[fit-content]", "tw:min-h-[28px]", "tw:pt-[4px]",
    "tw:pr-[9px]", "tw:pb-[4px]", "tw:pl-[9px]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:currentColor]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:currentColor]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:currentColor]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:currentColor]", "tw:rounded-[6px]",
    "tw:text-[.74rem]", "tw:font-[700]", "tw:leading-[1.2]", "tw:[&.arena-cash-status_>_span]:w-[6px]",
    "tw:[&.arena-cash-status_>_span]:h-[6px]", "tw:[&.arena-cash-status_>_span]:[flex:0_0_6px]", "tw:[&.arena-cash-status_>_span]:rounded-[50%]", "tw:[&.arena-cash-status_>_span]:bg-[color:currentColor]",
    "tw:[&.arena-cash-status_>_span]:[background-image:none]",
  ].join(" "),
  "open": [
    "arena-cash-open", "tw:border-t-[color:#bce7cd]", "tw:border-r-[color:#bce7cd]", "tw:border-b-[color:#bce7cd]",
    "tw:border-l-[color:#bce7cd]", "tw:text-[color:#147345]", "tw:bg-[color:#edf9f1]", "tw:[background-image:none]",
  ].join(" "),
  "closed": [
    "arena-cash-closed", "tw:border-t-[color:#f0c5c5]", "tw:border-r-[color:#f0c5c5]", "tw:border-b-[color:#f0c5c5]",
    "tw:border-l-[color:#f0c5c5]", "tw:text-[color:#b73939]", "tw:bg-[color:#fff3f3]", "tw:[background-image:none]",
  ].join(" "),
  "notOpened": [
    "arena-cash-notOpened", "tw:border-t-[color:#ebd5a1]", "tw:border-r-[color:#ebd5a1]", "tw:border-b-[color:#ebd5a1]",
    "tw:border-l-[color:#ebd5a1]", "tw:text-[color:#8a651a]", "tw:bg-[color:#fff8e8]", "tw:[background-image:none]",
  ].join(" "),
  "summaryGrid": "arena-cash-summaryGrid tw:flex tw:flex-wrap tw:gap-x-6 tw:gap-y-2 tw:border-y tw:border-[var(--line)] tw:py-3 tw:[&_article]:grid tw:[&_article]:gap-1 tw:[&_span]:text-[11px] tw:[&_span]:text-[var(--muted)] tw:[&_strong]:text-sm tw:[&_strong]:tabular-nums",
  "operationGrid": [
    "arena-cash-operationGrid", "tw:grid", "tw:items-start", "tw:grid-cols-[repeat(2,_minmax(0,_1fr))]", "tw:viewport-1000:grid-cols-[1fr]",
    "tw:gap-y-[16px]", "tw:gap-x-[16px]",
  ].join(" "),
  "panel": "arena-cash-panel tw:grid tw:content-start tw:gap-3 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:[&_h2]:m-0 tw:[&_h2]:text-sm tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:text-[var(--muted)]",
  "form": "arena-cash-form tw:[&_input]:rounded-md! tw:[&_select]:rounded-md! tw:[&_select]:h-9! tw:[&_select]:min-h-9! tw:grid tw:grid-cols-[minmax(140px,200px)_minmax(200px,360px)] tw:items-start tw:gap-3 tw:viewport-620:grid-cols-1 tw:[&_label]:text-xs tw:[&_input]:h-9! tw:[&_input]:min-h-9! tw:[&_input]:text-xs! tw:[&_label]:gap-1",
  "fullWidth": [
    "arena-cash-fullWidth", "tw:[grid-column:1_/_-1]", "tw:viewport-480:[grid-column:1]",
  ].join(" "),
  "formActions": [
    "arena-cash-formActions", "tw:[grid-column:1_/_-1]", "tw:viewport-480:[grid-column:1]", "tw:flex",
    "tw:justify-end", "tw:pt-[4px]", "tw:viewport-480:[&.arena-cash-formActions_>_button]:w-[100%]",
  ].join(" "),
  "currencyInput": [
    "arena-cash-currencyInput", "tw:flex", "tw:items-stretch", "tw:w-[100%]",
    "tw:min-w-[0]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#cbdbe9]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#cbdbe9]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#cbdbe9]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#cbdbe9]", "tw:rounded-[7px]", "tw:bg-[color:#fff]", "tw:[background-image:none]",
    "tw:[&:focus-within]:[outline:2px_solid_#acd1f4]", "tw:[&:focus-within]:border-t-[color:#3175b7]", "tw:[&:focus-within]:border-r-[color:#3175b7]", "tw:[&:focus-within]:border-b-[color:#3175b7]",
    "tw:[&:focus-within]:border-l-[color:#3175b7]", "tw:[&.arena-cash-currencyInput_>_span]:grid", "tw:[&.arena-cash-currencyInput_>_span]:place-items-center", "tw:[&.arena-cash-currencyInput_>_span]:[flex:0_0_42px]",
    "tw:[&.arena-cash-currencyInput_>_span]:bg-[color:#f3f7fb]", "tw:[&.arena-cash-currencyInput_>_span]:[background-image:none]", "tw:[&.arena-cash-currencyInput_>_span]:border-r-[length:1px]", "tw:[&.arena-cash-currencyInput_>_span]:[border-right-style:solid]",
    "tw:[&.arena-cash-currencyInput_>_span]:border-r-[color:#d8e4ee]", "tw:[&.arena-cash-currencyInput_>_span]:rounded-[6px_0_0_6px]", "tw:[&.arena-cash-currencyInput_>_span]:text-[color:#536f88]", "tw:[&.arena-cash-currencyInput_>_span]:text-[.81rem]",
    "tw:[&.arena-cash-currencyInput_>_span]:font-[700]", "tw:[&.arena-cash-currencyInput_input]:w-[100%]", "tw:[&.arena-cash-currencyInput_input]:min-w-[0]", "tw:[&.arena-cash-currencyInput_input]:border-t-[length:0]",
    "tw:[&.arena-cash-currencyInput_input]:[border-top-style:none]", "tw:[&.arena-cash-currencyInput_input]:border-t-[color:currentColor]", "tw:[&.arena-cash-currencyInput_input]:border-r-[length:0]", "tw:[&.arena-cash-currencyInput_input]:[border-right-style:none]",
    "tw:[&.arena-cash-currencyInput_input]:border-r-[color:currentColor]", "tw:[&.arena-cash-currencyInput_input]:border-b-[length:0]", "tw:[&.arena-cash-currencyInput_input]:[border-bottom-style:none]", "tw:[&.arena-cash-currencyInput_input]:border-b-[color:currentColor]",
    "tw:[&.arena-cash-currencyInput_input]:border-l-[length:0]", "tw:[&.arena-cash-currencyInput_input]:[border-left-style:none]", "tw:[&.arena-cash-currencyInput_input]:border-l-[color:currentColor]", "tw:[&.arena-cash-currencyInput_input]:rounded-[0_6px_6px_0]",
    "tw:[&.arena-cash-currencyInput_input]:[box-shadow:none]", "tw:[&.arena-cash-currencyInput_input:focus]:[outline:0]", "tw:[&.arena-cash-currencyInput_input:focus]:[box-shadow:none]",
  ].join(" "),
  "movementList": [
    "arena-cash-movementList", "tw:grid", "tw:[&.arena-cash-movementList_article]:flex", "tw:[&.arena-cash-movementList_article]:justify-between",
    "tw:[&.arena-cash-movementList_article]:items-center", "tw:[&.arena-cash-movementList_article]:gap-y-[14px]", "tw:[&.arena-cash-movementList_article]:gap-x-[14px]", "tw:[&.arena-cash-movementList_article]:pt-[13px]",
    "tw:[&.arena-cash-movementList_article]:pr-[0]", "tw:[&.arena-cash-movementList_article]:pb-[13px]", "tw:[&.arena-cash-movementList_article]:pl-[0]", "tw:[&.arena-cash-movementList_article]:border-b-[length:1px]",
    "tw:[&.arena-cash-movementList_article]:[border-bottom-style:solid]", "tw:[&.arena-cash-movementList_article]:border-b-[color:#e6eef5]", "tw:[&.arena-cash-movementList_article:last-child]:border-b-[length:0]", "tw:[&.arena-cash-movementList_article:last-child]:[border-bottom-style:none]",
    "tw:[&.arena-cash-movementList_article:last-child]:border-b-[color:currentColor]", "tw:[&.arena-cash-movementList_article_>_span]:grid", "tw:[&.arena-cash-movementList_article_>_span]:gap-y-[4px]", "tw:[&.arena-cash-movementList_article_>_span]:gap-x-[4px]",
    "tw:[&.arena-cash-movementList_article_>_span]:min-w-[0]", "tw:[&.arena-cash-movementList_strong]:text-[color:#17385f]", "tw:[&.arena-cash-movementList_strong]:text-[.84rem]", "tw:[&.arena-cash-movementList_small]:text-[color:#667e93]",
    "tw:[&.arena-cash-movementList_small]:text-[.74rem]", "tw:[&.arena-cash-movementList_small]:[overflow-wrap:anywhere]", "tw:[&.arena-cash-movementList_b]:[flex:0_0_auto]", "tw:[&.arena-cash-movementList_b]:text-[.85rem]",
    "tw:[&.arena-cash-movementList_b]:[font-variant-numeric:tabular-nums]",
  ].join(" "),
  "positive": [
    "arena-cash-positive", "tw:text-[color:#087c50]",
  ].join(" "),
  "negative": [
    "arena-cash-negative", "tw:text-[color:#b5362e]",
  ].join(" "),
} as const;
export default styles;
