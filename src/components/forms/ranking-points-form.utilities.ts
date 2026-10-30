import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export const viewStyles = {
 grid_form: "tw:grid tw:min-w-0 tw:grid-cols-4 tw:gap-3 tw:viewport-980:grid-cols-2 tw:viewport-440:grid-cols-1",
 muted_form_full: "tw:sr-only", field: ui.field,
 section_actions_form_full: "tw:col-span-full tw:flex tw:justify-end tw:border-t tw:border-[var(--line)] tw:pt-3",
 button_button_primary: ui.primary,
} as const;
