import { operationalWorkspace } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";

const control = "tw:inline-flex tw:min-h-8 tw:w-fit tw:max-w-full tw:items-center tw:justify-center tw:gap-1.5 tw:rounded tw:border tw:px-2.5 tw:py-1 tw:text-xs tw:font-normal tw:leading-normal tw:shadow-none tw:[background-image:none] tw:cursor-pointer tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#215da5] tw:[&_svg]:size-4 tw:[&_svg]:shrink-0";
/** Tournament workspaces reuse the customer/ledger density without changing other modules. */
export const tournamentWorkspace = {
 ...operationalWorkspace,
 page: "tw:grid tw:w-full tw:min-w-0 tw:max-w-none tw:gap-3 tw:text-[var(--text)]",
 panel: "tw:grid tw:min-w-0 tw:gap-3 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3",
 list: "tw:min-w-0 tw:rounded-[10px] tw:border tw:border-[var(--line)] tw:bg-white",
 head: "tw:grid tw:min-w-0 tw:items-center tw:gap-3 tw:bg-[#174983] tw:px-3 tw:py-2 tw:text-[11px] tw:font-semibold tw:uppercase tw:text-white tw:viewport-760:hidden",
 row: "tw:grid tw:min-w-0 tw:items-center tw:gap-3 tw:border-b tw:border-[var(--line)] tw:px-3 tw:py-2 tw:text-[13px] tw:text-[var(--text)] tw:last:border-b-0 tw:[&>*]:min-w-0 tw:[&_strong]:font-medium tw:[&_small]:text-xs tw:[&_small]:text-[var(--muted)]",
 primary: control + " tw:border-[#215da5] tw:bg-[#215da5] tw:text-white tw:hover:bg-[#174983]",
 secondary: control + " tw:border-[var(--line-strong)] tw:bg-white tw:text-[#174983] tw:hover:border-[#215da5]",
 neutral: control + " tw:border-[var(--line-strong)] tw:bg-white tw:text-[var(--muted)] tw:hover:border-[#215da5]",
 success: control + " tw:border-[#087443] tw:bg-[#087443] tw:text-white tw:hover:bg-[#065b35]",
 danger: control + " tw:border-[#a02119] tw:bg-white tw:text-[#a02119] tw:hover:bg-red-50",
 warning: control + " tw:border-[#945000] tw:bg-[#945000] tw:text-white tw:hover:bg-[#763e00]",
 field: sharedUtilities.field + " tw:text-xs! tw:font-normal! tw:[&_:is(input,select,textarea)]:min-w-0 tw:[&_:is(input,select,textarea)]:rounded-md! tw:[&_:is(input,select,textarea)]:border-[#718bac]! tw:[&_:is(input,select,textarea)]:bg-white! tw:[&_:is(input,select,textarea)]:text-[13px]! tw:[&_:is(input,select,textarea)]:text-[var(--text)]! tw:[&_:is(input,select)]:min-h-8! tw:[&_:is(input,select)]:h-8! tw:[&_input::placeholder]:text-[var(--muted)]",
 filters: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:[&>label]:min-w-0 tw:[&_input]:min-w-0 tw:[&_select]:min-w-0",
 icon: "tw:inline-flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded tw:border-0 tw:bg-transparent tw:p-0 tw:text-[#215da5] tw:cursor-pointer tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#215da5] tw:hover:bg-white tw:[&_svg]:size-[18px]",
 table: "tw:w-full tw:border-collapse tw:text-[13px] tw:[&_thead]:bg-[#174983] tw:[&_thead]:text-white tw:[&_th]:px-3 tw:[&_th]:py-2 tw:[&_th]:text-left tw:[&_th]:text-[11px] tw:[&_th]:font-semibold tw:[&_th]:uppercase tw:[&_td]:min-w-0 tw:[&_td]:border-b tw:[&_td]:border-[var(--line)] tw:[&_td]:px-3 tw:[&_td]:py-2 tw:[&_td]:align-middle tw:[&_tbody_tr:last-child_td]:border-b-0",
};
