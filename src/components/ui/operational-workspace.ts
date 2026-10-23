import { sharedUtilities } from "./shared.utilities";

export const operationalWorkspace = {
  page: "tw:grid tw:min-w-0 tw:gap-3",
  toolbar: "tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:[&_h1]:m-0 tw:[&_h1]:text-lg tw:[&_h1]:font-semibold tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:text-[var(--muted)]",
  panel: "tw:min-w-0 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-3",
  filters: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2 tw:[&_label]:min-w-0 tw:[&_input]:min-w-0 tw:[&_select]:min-w-0 tw:[&_input]:max-w-full tw:[&_select]:max-w-full",
  list: "tw:min-w-0 tw:rounded-[10px] tw:border tw:border-[var(--line)] tw:bg-[var(--panel)]",
  head: "tw:grid tw:gap-3 tw:border-b tw:border-[var(--line)] tw:bg-[#f6f8fb] tw:px-3 tw:py-2 tw:text-[11px] tw:font-semibold tw:text-[var(--muted)] tw:viewport-760:hidden",
  row: "tw:grid tw:min-w-0 tw:items-center tw:gap-3 tw:border-b tw:border-[var(--line)] tw:px-3 tw:py-2.5 tw:last:border-b-0 tw:[&>*]:min-w-0 tw:[&_strong]:text-[13px] tw:[&_strong]:font-semibold tw:[&_strong]:break-words tw:[&_small]:block tw:[&_small]:text-[11px] tw:[&_small]:text-[var(--muted)]",
  empty: "tw:m-0 tw:p-3 tw:text-xs tw:text-[var(--muted)]",
  form: sharedUtilities.gridForm,
  field: sharedUtilities.field + " tw:text-xs! tw:[&_input]:h-9! tw:[&_input]:min-h-9! tw:[&_select]:h-9! tw:[&_select]:min-h-9! tw:[&_input]:rounded-lg! tw:[&_select]:rounded-lg! tw:[&_input]:px-2.5! tw:[&_select]:px-2.5! tw:[&_input]:text-[13px]! tw:[&_select]:text-[13px]!",
  primary: sharedUtilities.buttonButtonPrimaryButtonSmall,
  secondary: sharedUtilities.buttonButtonSmall,
} as const;
