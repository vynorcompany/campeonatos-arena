import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export const viewStyles = {
  field_category_athlete_search: `${ui.field} category-athlete-search tw:relative tw:min-w-0 tw:[&_label]:text-xs!`,
  category_athlete_search_results: "category-athlete-search-results tw:absolute tw:top-full tw:left-0 tw:right-0 tw:z-50 tw:mt-1 tw:grid tw:max-h-52 tw:overflow-y-auto tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:p-1 tw:shadow-lg tw:[&_button]:w-full tw:[&_button]:rounded tw:[&_button]:border-0 tw:[&_button]:bg-white tw:[&_button]:px-3 tw:[&_button]:py-2 tw:[&_button]:text-left tw:[&_button]:text-sm tw:[&_button:hover]:bg-[#174983] tw:[&_button:hover]:text-white tw:[&_button:focus-visible]:bg-[#174983] tw:[&_button:focus-visible]:text-white tw:[&_span]:p-3 tw:[&_span]:text-xs",
  grid_form_category_pair_form: "category-pair-form tw:flex tw:min-h-full tw:min-w-0 tw:flex-col tw:gap-4",
  field_field_submit_category_pair_submit: "tw:mt-auto tw:flex tw:justify-end tw:border-t tw:border-[var(--line)] tw:pt-3",
  button_button_primary: ui.primary,
  muted_form_full: "tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]",
} as const;
