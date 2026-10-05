import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "t_category_index": [
    "t-category-index", "tw:pt-[22px]", "tw:viewport-760:pt-[16px]", "tw:pr-[22px]",
    "tw:viewport-760:pr-[16px]", "tw:pb-[22px]", "tw:viewport-760:pb-[16px]", "tw:pl-[22px]",
    "tw:viewport-760:pl-[16px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#e3eaf3]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#e3eaf3]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:#e3eaf3]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:#e3eaf3]", "tw:rounded-[14px]", "tw:bg-[color:#fff]", "tw:[background-image:none]",
    "tw:[box-shadow:0_8px_22px_rgba(19,_55,_104,_.055)]",
  ].join(" "),
  "t_category_index_head": [
    "t-category-index-head", "tw:flex", "tw:items-center", "tw:viewport-760:items-start",
    "tw:justify-between", "tw:gap-y-[20px]", "tw:gap-x-[20px]", "tw:pb-[20px]",
    "tw:[&_h2]:mt-[0]", "tw:[&_h2]:mr-[0]", "tw:[&_h2]:mb-[5px]", "tw:[&_h2]:ml-[0]",
    "tw:[&_h2]:text-[1.28rem]", "tw:[&_h2]:tracking-[-0.04em]", "tw:[&_h2]:text-[color:#102b56]", "tw:[&_.button]:min-h-[38px]",
    "tw:[&_.button]:font-[750]", "tw:[&_.button]:inline-flex", "tw:[&_.button]:items-center", "tw:[&_.button]:justify-center",
    "tw:[&_.button]:gap-y-[7px]", "tw:[&_.button]:gap-x-[7px]", "tw:[&_.button]:[padding-inline:14px]", "tw:[&_.button]:rounded-[8px]",
    "tw:[&_.button]:text-[.78rem]", "tw:viewport-760:flex-col",
  ].join(" "),
  "muted": sharedUtilities.muted,
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "category_add_symbol": [
    "category-add-symbol", "tw:grid", "tw:w-[17px]", "tw:h-[17px]",
    "tw:place-items-center", "tw:text-[1.25rem]", "tw:font-[400]", "tw:leading-[1]",
  ].join(" "),
  "t_category_list": [
    "t-category-list", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#dfe7f1]",
  ].join(" "),
  "t_category_table_head": [
    "t-category-table-head", "tw:grid", "tw:viewport-760:hidden", "tw:grid-cols-[minmax(0,_1fr)_6.5rem_8.5rem_6rem_7rem]",
    "tw:gap-y-[12px]", "tw:gap-x-[12px]", "tw:items-center", "tw:pt-[13px]",
    "tw:pr-[0]", "tw:pb-[10px]", "tw:pl-[52px]", "tw:text-[color:#607695]",
    "tw:text-[.64rem]", "tw:font-[800]", "tw:tracking-[.04em]", "tw:uppercase",
  ].join(" "),
  "t_category_row": [
    "t-category-row", "tw:grid", "tw:grid-cols-[40px_minmax(0,_1fr)_6.5rem_8.5rem_6rem_7rem]", "tw:viewport-760:grid-cols-[36px_minmax(0,_1fr)_auto]",
    "tw:gap-y-[12px]", "tw:viewport-760:gap-y-[10px]", "tw:gap-x-[12px]", "tw:viewport-760:gap-x-[10px]",
    "tw:items-center", "tw:pt-[15px]", "tw:pr-[0]", "tw:pb-[15px]",
    "tw:pl-[0]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#e6edf5]",
    "tw:min-h-[80px]", "tw:[&_strong]:min-w-[0]", "tw:[&_strong]:[overflow-wrap:anywhere]", "tw:[&_strong]:tracking-[-0.01em]",
  ].join(" "),
  "t_category_icon": [
    "t-category-icon", "tw:grid", "tw:w-[38px]", "tw:h-[38px]",
    "tw:place-items-center", "tw:rounded-[9px]", "tw:bg-[color:transparent]", "tw:[background-image:linear-gradient(145deg,_#0c61dc,_#00419c)]",
    "tw:text-[color:#fff]", "tw:text-[1.1rem]", "tw:[&_.event-icon]:w-[19px]", "tw:[&_.event-icon]:h-[19px]",
  ].join(" "),
  "t_category_name": [
    "t-category-name", "tw:grid", "tw:gap-y-[4px]", "tw:gap-x-[4px]",
    "tw:min-w-[0]", "tw:[&_strong]:text-[color:#132d58]", "tw:[&_small]:text-[color:#7184a5]", "tw:[&_small]:text-[.76rem]",
  ].join(" "),
  "t_category_format": [
    "t-category-format", "tw:text-[color:#36699c]", "tw:text-[.82rem]", "tw:w-[fit-content]",
    "tw:pt-[5px]", "tw:pr-[8px]", "tw:pb-[5px]", "tw:pl-[8px]",
    "tw:rounded-[6px]", "tw:bg-[color:#edf4ff]", "tw:[background-image:none]", "tw:font-[700]",
    "tw:viewport-680:[grid-row:2]", "tw:viewport-760:hidden",
  ].join(" "),
  "t_category_pairs": [
    "t-category-pairs", "tw:text-[color:#50698f]", "tw:text-[.82rem]", "tw:viewport-680:[grid-row:2]",
    "tw:viewport-680:[&::before]:[content:'·_']", "tw:viewport-760:hidden",
  ].join(" "),
  "t_category_status": [
    "t-category-status", "tw:w-[fit-content]", "tw:pt-[5px]", "tw:pr-[8px]",
    "tw:pb-[5px]", "tw:pl-[8px]", "tw:rounded-[6px]", "tw:text-[.75rem]",
    "tw:font-[800]", "tw:[&.active]:bg-[color:#e4f8ed]", "tw:[&.active]:[background-image:none]", "tw:[&.active]:text-[color:#148650]",
    "tw:[&.pending]:bg-[color:#fff5df]", "tw:[&.pending]:[background-image:none]", "tw:[&.pending]:text-[color:#9b6813]", "tw:viewport-760:hidden",
  ].join(" "),
  "t_category_enter": [
    "t-category-enter", "tw:text-[color:#0759d6]", "tw:font-[700]", "tw:text-center",
    "tw:[transition:color_160ms_var(--ease-standard),_transform_160ms_var(--ease-standard)]", "tw:inline-flex", "tw:justify-center", "tw:gap-y-[7px]",
    "tw:gap-x-[7px]", "tw:min-h-[36px]", "tw:pt-[0]", "tw:pr-[11px]",
    "tw:pb-[0]", "tw:pl-[11px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#d6e1ef]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#d6e1ef]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#d6e1ef]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#d6e1ef]", "tw:rounded-[8px]", "tw:text-[.8rem]",
    "tw:items-center", "tw:leading-[1]", "tw:hover:text-[color:var(--brand-strong)]", "tw:hover:[transform:none]",
    "tw:hover:border-t-[color:#0759d6]", "tw:hover:border-r-[color:#0759d6]", "tw:hover:border-b-[color:#0759d6]", "tw:hover:border-l-[color:#0759d6]",
    "tw:hover:bg-[color:#eff6ff]", "tw:hover:[background-image:none]", "tw:viewport-760:[grid-column:3]", "tw:viewport-760:[grid-row:1]",
    "tw:viewport-680:[align-self:center]", "tw:[&_span]:text-[1.25rem]", "tw:[&_span]:leading-[.8]",
  ].join(" "),
  "t_category_empty": [
    "t-category-empty", "tw:mt-[0]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:pt-[20px]", "tw:pr-[0]", "tw:pb-[20px]",
    "tw:pl-[0]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:text-[color:var(--muted)]",
  ].join(" "),
} as const;
