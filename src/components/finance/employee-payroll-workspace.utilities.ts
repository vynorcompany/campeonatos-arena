import { sharedUtilities } from "@/components/ui/shared.utilities";

export const payrollStyles = {
  page: "employee-payroll-workspace tw:grid tw:gap-4 tw:min-w-0",
  toolbar: "tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:[&_h1]:m-0 tw:[&_h1]:text-xl tw:[&_h1]:font-bold tw:[&_p]:m-0 tw:[&_p]:mt-1 tw:[&_p]:text-sm tw:[&_p]:text-[var(--muted)]",
  button: sharedUtilities.buttonButtonPrimaryButtonSmall,
  secondary: sharedUtilities.buttonButtonSmall,
  filters: "tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:[&_input]:h-10 tw:[&_input]:min-w-0 tw:[&_input]:rounded-lg tw:[&_input]:border tw:[&_input]:border-[var(--line)] tw:[&_input]:bg-white tw:[&_input]:px-3 tw:[&_input]:text-sm",
  summary: "tw:grid tw:grid-cols-3 tw:gap-3 tw:viewport-620:grid-cols-1 tw:[&_div]:rounded-xl tw:[&_div]:border tw:[&_div]:border-[var(--line)] tw:[&_div]:bg-white tw:[&_div]:p-3 tw:[&_span]:block tw:[&_span]:text-xs tw:[&_span]:text-[var(--muted)] tw:[&_strong]:text-lg",
  list: "tw:overflow-hidden tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-white",
  row: "employee-payroll-row tw:grid tw:grid-cols-[minmax(0,1fr)_140px_100px_90px] tw:items-center tw:gap-3 tw:border-b tw:border-[var(--line)] tw:px-4 tw:py-3 tw:last:border-b-0 tw:viewport-760:grid-cols-[minmax(0,1fr)_auto] tw:[&_strong]:text-sm tw:[&_small]:block tw:[&_small]:text-xs tw:[&_small]:text-[var(--muted)]",
  overlay: "tw:fixed tw:inset-0 tw:z-[1000] tw:flex tw:items-center tw:justify-center tw:bg-black/30 tw:p-4 tw:viewport-620:p-2",
  modal: "employee-payroll-modal tw:grid tw:w-full tw:max-w-[760px] tw:max-h-[calc(100svh_-_32px)] tw:overflow-y-auto tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-white tw:p-5 tw:gap-4 tw:viewport-620:p-4",
  form: "tw:grid tw:grid-cols-2 tw:gap-3 tw:viewport-620:grid-cols-1 tw:[&_label]:grid tw:[&_label]:gap-1 tw:[&_label]:text-xs tw:[&_label]:font-semibold tw:[&_input]:w-full tw:[&_input]:min-w-0 tw:[&_input]:h-10 tw:[&_input]:rounded-lg tw:[&_input]:border tw:[&_input]:border-[var(--line)] tw:[&_input]:bg-white tw:[&_input]:px-3 tw:[&_input]:text-sm tw:[&_select]:w-full tw:[&_select]:min-w-0 tw:[&_select]:h-10 tw:[&_select]:rounded-lg tw:[&_select]:border tw:[&_select]:border-[var(--line)] tw:[&_select]:bg-white tw:[&_select]:px-3 tw:[&_select]:text-sm",
  full: "tw:col-span-full",
  preview: "tw:col-span-full tw:grid tw:grid-cols-2 tw:gap-2 tw:rounded-lg tw:bg-[#f4f9fd] tw:p-3 tw:text-sm tw:[&_span]:text-[var(--muted)] tw:[&_strong]:text-right",
  status: "payroll-payment-switch tw:inline-flex tw:h-10 tw:items-center tw:gap-2 tw:border-0 tw:bg-transparent tw:p-0 tw:text-xs tw:text-[var(--muted)] tw:[&_i]:relative tw:[&_i]:h-4 tw:[&_i]:w-[30px] tw:[&_i]:rounded-full tw:[&_i]:bg-slate-300 tw:[&_i]:transition-colors tw:[&_i::after]:absolute tw:[&_i::after]:top-[2px] tw:[&_i::after]:left-[2px] tw:[&_i::after]:size-3 tw:[&_i::after]:rounded-full tw:[&_i::after]:bg-white tw:[&_i::after]:content-[''] tw:[&_i::after]:transition-transform tw:[&[aria-checked=true]_i]:bg-emerald-600 tw:[&[aria-checked=true]_i::after]:translate-x-[14px] tw:focus-visible:outline-2 tw:focus-visible:outline-[var(--primary)] tw:disabled:cursor-default",
} as const;
