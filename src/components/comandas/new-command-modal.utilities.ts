import { sharedUtilities as shared } from "@/components/ui/shared.utilities";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export const viewStyles = {
  commands_new_modal_backdrop: "commands-new-modal-backdrop tw:fixed tw:inset-0 tw:z-[95] tw:grid tw:place-items-center tw:bg-slate-950/40 tw:p-3",
  commands_new_modal: "commands-new-modal tw:h-[min(600px,calc(var(--workspace-viewport-height,100dvh)_-_24px))] tw:content-start tw:grid tw:w-full tw:max-w-[440px] tw:min-w-0 tw:gap-3 tw:max-h-[calc(var(--workspace-viewport-height,100dvh)_-_24px)] tw:overflow-y-auto tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-white tw:p-4 tw:shadow-xl tw:[&>header]:flex tw:[&>header]:items-start tw:[&>header]:justify-between tw:[&>header]:gap-3 tw:[&>header]:border-b tw:[&>header]:border-[var(--line)] tw:[&>header]:pb-3 tw:[&_header_span]:hidden tw:[&_h2]:m-0 tw:[&_h2]:text-base tw:[&_h2]:font-semibold tw:[&_p]:m-0 tw:[&_header_p]:mt-1 tw:[&_header_p]:text-xs tw:[&_header_p]:text-[var(--muted)]",
  commands_modal_close: "tw:grid tw:size-8 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:text-base tw:text-[var(--muted)]",
  field: ui.field,
  commands_client_results: "commands-client-results tw:grid tw:max-h-[300px] tw:overflow-y-auto tw:rounded-lg tw:border tw:border-[var(--line)] tw:[&_button]:flex tw:[&_button]:items-center tw:[&_button]:justify-between tw:[&_button]:gap-2 tw:[&_button]:border-0 tw:[&_button]:border-b tw:[&_button]:border-[var(--line)] tw:[&_button]:bg-white tw:[&_button]:px-3 tw:[&_button]:py-2.5 tw:[&_button]:text-left tw:[&_button]:cursor-pointer tw:[&_button:last-child]:border-b-0 tw:[&_button:hover]:bg-slate-50 tw:[&_strong]:text-xs tw:[&_strong]:font-medium tw:[&_p]:p-3 tw:[&_p]:text-xs tw:[&_p]:text-[var(--muted)]",
  form_error: shared.formError,
} as const;
