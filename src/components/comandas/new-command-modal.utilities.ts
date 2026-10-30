import { sharedUtilities as shared } from "@/components/ui/shared.utilities";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export const viewStyles = {
  field: ui.field,
  commands_client_results: "commands-client-results tw:grid tw:max-h-[300px] tw:overflow-y-auto tw:rounded-lg tw:border tw:border-[var(--line)] tw:[&_button]:flex tw:[&_button]:items-center tw:[&_button]:justify-between tw:[&_button]:gap-2 tw:[&_button]:border-0 tw:[&_button]:border-b tw:[&_button]:border-[var(--line)] tw:[&_button]:bg-white tw:[&_button]:px-3 tw:[&_button]:py-2.5 tw:[&_button]:text-left tw:[&_button]:cursor-pointer tw:[&_button:last-child]:border-b-0 tw:[&_button:hover]:bg-[#174983] tw:[&_button:hover]:text-white tw:[&_button:hover_span]:text-white tw:[&_button:focus-visible]:bg-[#174983] tw:[&_button:focus-visible]:text-white tw:[&_button:focus-visible_span]:text-white tw:[&_strong]:text-xs tw:[&_strong]:font-medium tw:[&_p]:p-3 tw:[&_p]:text-xs tw:[&_p]:text-[var(--muted)]",
  form_error: shared.formError,
} as const;
