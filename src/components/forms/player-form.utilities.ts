import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export const viewStyles = {
  form: "tw:grid tw:h-full tw:min-h-0 tw:min-w-0 tw:grid-rows-[minmax(0,1fr)_auto] tw:text-[#172d4c]",
  body: "tw:min-h-0 tw:min-w-0 tw:overflow-y-auto tw:overscroll-contain tw:pr-2 tw:pb-4 tw:[scrollbar-gutter:stable]",
  fields: "tw:grid tw:min-w-0 tw:grid-cols-3 tw:gap-x-4 tw:gap-y-3 tw:viewport-700:grid-cols-1",
  field: "tw:grid tw:min-w-0 tw:content-start tw:gap-1.5 tw:text-[13px] tw:font-normal tw:text-[#294b76] tw:[&_:is(input,select)]:box-border tw:[&_:is(input,select)]:w-full tw:[&_:is(input,select)]:min-w-0 tw:[&_:is(input,select)]:min-h-10 tw:[&_:is(input,select)]:rounded-md tw:[&_:is(input,select)]:border tw:[&_:is(input,select)]:border-[#718bac] tw:[&_:is(input,select)]:bg-white tw:[&_:is(input,select)]:px-3 tw:[&_:is(input,select)]:py-2 tw:[&_:is(input,select)]:text-[13px] tw:[&_:is(input,select)]:font-normal tw:[&_:is(input,select)]:text-[#172d4c] tw:[&_input::placeholder]:text-[#526781] tw:[&_:is(input,select):focus-visible]:outline-2 tw:[&_:is(input,select):focus-visible]:outline-offset-1 tw:[&_:is(input,select):focus-visible]:outline-[#1e5ea8]",
  group: "tw:m-0 tw:mt-5 tw:min-w-0 tw:border-0 tw:border-t tw:border-[#d5e1ef] tw:p-0 tw:pt-4",
  legend: "tw:mb-2 tw:px-0 tw:pr-3 tw:text-sm tw:font-semibold tw:text-[#172d4c]",
  permissions: "tw:mt-5 tw:grid tw:min-w-0 tw:gap-3 tw:border-t tw:border-[#d5e1ef] tw:pt-4",
  footer: "tw:flex tw:min-w-0 tw:shrink-0 tw:items-center tw:justify-end tw:gap-2 tw:border-t tw:border-[#d5e1ef] tw:bg-[#f3f7fc] tw:p-3",
  primary: ui.primary+" tw:min-h-9! tw:text-[13px]!",
  secondary: ui.secondary+" tw:min-h-9! tw:text-[13px]!",
  error: "tw:m-0 tw:mt-3 tw:rounded tw:bg-red-50 tw:p-3 tw:text-sm tw:text-red-800",
  success: "tw:m-0 tw:mt-3 tw:rounded tw:bg-green-50 tw:p-3 tw:text-sm tw:text-green-800",
} as const;
