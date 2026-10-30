import { sharedUtilities } from "@/components/ui/shared.utilities";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export const viewStyles = {
  muted: sharedUtilities.muted,
  data_table: "ranking-detail-table tw:w-full tw:border-collapse tw:text-sm tw:[&_th]:bg-[#174983] tw:[&_th]:p-3 tw:[&_th]:text-left tw:[&_th]:text-xs tw:[&_th]:font-semibold tw:[&_th]:text-white tw:[&_td]:border-b tw:[&_td]:border-[var(--line)] tw:[&_td]:p-3 tw:[&_td]:align-middle",
  stack_md_ranking_detail_page: "ranking-detail-page tw:grid tw:min-w-0 tw:gap-4 tw:[&_input]:min-w-0 tw:[&_select]:min-w-0 tw:[&_.ranking-general-options]:grid tw:[&_.ranking-general-options]:grid-cols-[repeat(2,minmax(0,1fr))] tw:[&_.ranking-general-options]:gap-3 tw:viewport-680:[&_.ranking-general-options]:grid-cols-1",
  page_header_ranking_detail_header: ui.toolbar,
  ranking_detail_identity: "tw:grid tw:min-w-0 tw:gap-1 tw:[&_h1]:m-0 tw:[&_h1]:text-xl tw:[&_h1]:font-semibold tw:[&_h1]:break-words tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:text-[var(--muted)]",
  section_actions: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-2",
  button: ui.secondary,
  section_card_ranking_detail_period: "ranking-detail-period tw:grid tw:min-w-0 tw:gap-3 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-4",
  stack_xs: "tw:grid tw:gap-1 tw:text-xs",
  button_primary: "tw:border-[#1e5ea8]! tw:bg-[#1e5ea8]! tw:text-white! tw:hover:bg-[#174983]!",
  inline_form: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-3 tw:[&>div]:min-w-0 tw:[&>div]:flex-1 tw:[&>div]:basis-44",
  field: ui.field,
  button_button_primary: ui.primary,
  section_actions_form_full: "tw:col-span-full tw:flex tw:justify-end tw:gap-2",
  form_error: sharedUtilities.formError,
  stack_md: ui.page,
  section_card: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-[var(--line)] tw:pt-3 tw:[&_p]:m-0 tw:[&_p]:text-xs",
  button_button_danger: sharedUtilities.buttonButtonDangerButtonSmall,
  simple_list: "tw:grid tw:min-w-0",
  simple_item: "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-3 tw:last:border-0 tw:[&>div]:grid tw:[&>div]:min-w-0 tw:[&>div]:gap-1 tw:[&_strong]:break-words tw:[&_span]:text-xs tw:[&_span]:text-[var(--muted)]",
} as const;
