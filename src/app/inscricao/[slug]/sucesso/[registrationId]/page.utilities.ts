import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export const viewStyles = {
  public_reg_success_page: "public-reg-success-page tw:grid tw:min-h-dvh tw:place-items-center tw:bg-white tw:p-6 tw:viewport-600:p-3 tw:dark:bg-[#07111f]",
  public_reg_success_card: "public-reg-success-card tw:grid tw:w-full tw:min-w-0 tw:max-w-[680px] tw:gap-4 tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-white tw:p-6 tw:text-[#231f20] tw:viewport-600:p-4 tw:dark:border-[#33455c] tw:dark:bg-[#0d1b2c] tw:dark:text-white tw:[&_h1]:m-0 tw:[&_h1]:text-2xl tw:[&_h1]:font-semibold tw:[&>p]:m-0 tw:[&>p]:text-sm tw:[&>p]:leading-relaxed tw:[&>p]:text-[#52627a] tw:dark:[&>p]:text-[#b8c8dc]",
  eyebrow: "eyebrow tw:text-xs! tw:font-semibold tw:tracking-wide tw:text-[#174983]! tw:dark:text-white!",
  public_reg_success_summary: "public-reg-success-summary tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:viewport-600:grid-cols-1 tw:dark:border-[#33455c] tw:dark:bg-[#0d1b2c] tw:[&>div]:grid tw:[&>div]:min-w-0 tw:[&>div]:content-start tw:[&>div]:gap-1 tw:[&_span]:text-xs tw:[&_span]:text-[#52627a] tw:dark:[&_span]:text-[#b8c8dc] tw:[&_strong]:break-words tw:[&_strong]:text-sm tw:[&>div:last-child:nth-child(odd)]:col-span-2 tw:viewport-600:[&>div:last-child:nth-child(odd)]:col-span-1",
  status_confirmed: "status-confirmed tw:w-fit tw:rounded-md tw:bg-emerald-50 tw:px-2 tw:py-1 tw:text-xs! tw:font-semibold tw:text-emerald-800",
  status_pending: "status-pending tw:w-fit tw:rounded-md tw:bg-amber-50 tw:px-2 tw:py-1 tw:text-xs! tw:font-semibold tw:text-amber-800",
  status_expired: "status-expired tw:w-fit tw:rounded-md tw:bg-red-50 tw:px-2 tw:py-1 tw:text-xs! tw:font-semibold tw:text-red-800",
  pix_payment: "pix-payment tw:grid tw:w-full tw:min-w-0 tw:justify-items-start tw:gap-3 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:dark:border-[#33455c] tw:dark:bg-[#0d1b2c] tw:[&_img]:w-[min(100%,200px)] tw:[&_img]:rounded-md tw:[&_div]:grid tw:[&_div]:min-w-0 tw:[&_div]:gap-2 tw:[&_span]:text-xs tw:[&_span]:text-[#52627a] tw:dark:[&_span]:text-[#b8c8dc] tw:[&_code]:max-w-full tw:[&_code]:break-all tw:[&_code]:text-xs tw:[&_code]:text-[#231f20] tw:dark:[&_code]:text-white tw:[&_small]:text-xs",
  payment_controls: "tw:grid tw:min-w-0 tw:justify-items-start tw:gap-3",
  payment_deadline: "tw:m-0 tw:text-sm tw:font-semibold tw:text-[#174983] tw:dark:text-white",
  payment_copy_button: ui.primary + " tw:w-fit",
  payment_refresh_button: ui.secondary + " tw:dark:border-[#33455c] tw:dark:bg-[#0d1b2c] tw:dark:text-white",
  button_button_primary: ui.primary,
  button: ui.secondary + " tw:w-fit tw:dark:border-[#33455c] tw:dark:bg-[#0d1b2c] tw:dark:text-white",
} as const;
