import { sharedUtilities } from "./shared.utilities";

export const operationalWorkspace = {
  page: "tw:grid tw:min-w-0 tw:gap-4",
  toolbar: "tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:[&_h1]:sr-only tw:[&_p]:m-0 tw:[&_p]:text-sm tw:[&_p]:text-[var(--muted)]",
  panel: "tw:min-w-0 tw:rounded-[var(--radius-md)] tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-4 tw:viewport-440:p-3",
  filters: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-3 tw:[&_label]:min-w-0 tw:[&_input]:min-w-0 tw:[&_input]:max-w-full tw:[&_select]:min-w-0 tw:[&_select]:max-w-full",
  list: "tw:min-w-0 tw:rounded-[var(--radius-md)] tw:border tw:border-[var(--line)] tw:bg-[var(--panel)]",
  head: "tw:grid tw:gap-3 tw:border-b tw:border-[var(--line)] tw:bg-[var(--panel-muted)] tw:px-4 tw:py-3 tw:text-xs tw:font-semibold tw:text-[var(--muted)] tw:viewport-760:hidden",
  row: "tw:grid tw:min-w-0 tw:items-center tw:gap-3 tw:border-b tw:border-[var(--line)] tw:px-4 tw:py-3 tw:last:border-b-0 tw:[&>*]:min-w-0 tw:[&_strong]:text-sm tw:[&_strong]:break-words tw:[&_small]:block tw:[&_small]:text-xs tw:[&_small]:text-[var(--muted)]",
  empty: "tw:m-0 tw:p-4 tw:text-sm tw:text-[var(--muted)]",
  form: sharedUtilities.gridForm,
  field: sharedUtilities.field,
  primary: sharedUtilities.buttonButtonPrimaryButtonSmall,
  secondary: sharedUtilities.buttonButtonSmall,
} as const;
