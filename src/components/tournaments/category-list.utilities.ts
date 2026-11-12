import { managementControls } from "@/components/ui/management-controls";
import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "t_category_index": "t-category-index tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[#d4e0ee] tw:bg-white",
  "t_category_index_head": "t-category-index-head tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:px-3 tw:pt-3 tw:[&_h2]:m-0 tw:[&_h2]:text-sm tw:[&_h2]:font-medium",
  "muted": sharedUtilities.muted,
  "button_button_primary": (sharedUtilities.buttonButtonPrimary) + " " + managementControls.primary,
  "category_add_symbol": [
    "category-add-symbol", "tw:grid", "tw:w-[17px]", "tw:h-[17px]",
    "tw:place-items-center", "tw:text-[1.25rem]", "tw:font-[400]", "tw:leading-[1]",
  ].join(" "),
  "t_category_list": [
    "t-category-list", "tw:@container", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#dfe7f1]",
  ].join(" "),
  "t_category_table_head": "t-category-table-head tw:grid tw:grid-cols-[minmax(0,1fr)_85px_105px_80px_75px] tw:items-center tw:gap-3 tw:border-y tw:border-[#d4e0ee] tw:bg-[#f5f8fc] tw:px-3 tw:py-2 tw:text-[11px] tw:text-[#526781] tw:viewport-760:hidden",
  "t_category_row": "t-category-row tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_85px_105px_80px_75px] tw:items-center tw:gap-3 tw:border-b tw:border-[#e3ebf4] tw:px-3 tw:py-2.5 tw:last:border-b-0 tw:viewport-760:grid-cols-[minmax(0,1fr)_auto] tw:viewport-760:[&>a]:col-start-2 tw:viewport-760:[&>a]:row-start-1",
  "t_category_icon": [
    "t-category-icon", "tw:grid", "tw:w-[38px]", "tw:h-[38px]", "tw:@max-[700px]:[grid-column:1]", "tw:@max-[700px]:[grid-row:1/3]",
    "tw:place-items-center", "tw:rounded-[9px]", "tw:bg-[color:#174983]", "tw:[background-image:none]",
    "tw:text-[color:#fff]", "tw:text-[1.1rem]", "tw:[&_.event-icon]:w-[19px]", "tw:[&_.event-icon]:h-[19px]",
  ].join(" "),
  "t_category_name": "t-category-name tw:min-w-0 tw:[&_strong]:text-sm tw:[&_strong]:font-medium tw:[&_strong]:break-words",
  "t_category_format": "t-category-format tw:text-xs tw:text-[#526781]",
  "t_category_pairs": "t-category-pairs tw:text-xs tw:tabular-nums",
  "t_category_status": "t-category-status tw:w-fit tw:rounded tw:bg-[#edf4fa] tw:px-1.5 tw:py-0.5 tw:text-[11px] tw:text-[#174983]",
  "t_category_enter": "t-category-enter tw:inline-flex tw:w-fit tw:items-center tw:gap-1 tw:rounded tw:border tw:border-[#b8cde7] tw:bg-[#e8f1fc] tw:px-2 tw:py-1 tw:text-xs tw:text-[#174983] tw:no-underline tw:hover:bg-[#d4e6fa] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2",
  "t_category_empty": [
    "t-category-empty", "tw:mt-[0]", "tw:mr-[0]", "tw:mb-[0]",
    "tw:ml-[0]", "tw:pt-[20px]", "tw:pr-[0]", "tw:pb-[20px]",
    "tw:pl-[0]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:var(--line)]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:var(--line)]", "tw:text-[color:var(--muted)]",
  ].join(" "),
} as const;
