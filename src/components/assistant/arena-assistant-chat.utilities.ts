import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "assistant_chat": "assistant-chat tw:flex tw:h-[clamp(360px,calc(100dvh_-_180px),880px)] tw:w-full tw:min-w-0 tw:flex-col tw:rounded-xl tw:border tw:border-solid tw:border-[var(--line)] tw:bg-white tw:shadow-[var(--shadow)]",
  "assistant_chat_messages": "assistant-chat-messages tw:grid tw:min-h-0 tw:flex-1 tw:content-start tw:gap-3 tw:overflow-y-auto tw:overscroll-contain tw:p-5 tw:viewport-700:p-3",
  "assistant_message": "assistant-message tw:grid tw:w-[min(78%,680px)] tw:min-w-0 tw:gap-1 tw:rounded-lg tw:border tw:border-solid tw:border-[var(--line)] tw:bg-[var(--panel-muted)] tw:px-4 tw:py-3 tw:text-sm tw:text-[var(--text)] tw:[overflow-wrap:anywhere] tw:[&_span]:text-xs tw:[&_span]:font-medium tw:[&_p]:m-0 tw:[&_p]:whitespace-pre-wrap tw:[&_p]:leading-relaxed tw:[&.assistant-message-user]:justify-self-end tw:[&.assistant-message-user]:bg-[var(--brand)] tw:[&.assistant-message-user]:border-[var(--brand)] tw:[&.assistant-message-user]:text-white tw:viewport-700:w-[92%]",
  "assistant_chat_empty": "assistant-chat-empty tw:grid tw:h-full tw:content-center tw:justify-items-center tw:gap-2 tw:px-4 tw:text-center tw:text-sm tw:text-[var(--muted)] tw:[&_strong]:text-[var(--text)] tw:[&_strong]:text-base tw:[&_span]:max-w-[52ch]",
  "assistant_chat_form": "assistant-chat-form tw:grid tw:shrink-0 tw:gap-2 tw:border-0 tw:border-t tw:border-solid tw:border-[var(--line)] tw:p-4 tw:text-sm tw:[&_>_div]:flex tw:[&_>_div]:items-end tw:[&_>_div]:gap-2 tw:[&_textarea]:min-w-0 tw:[&_textarea]:flex-1 tw:[&_textarea]:resize-none tw:[&_textarea]:min-h-[48px] tw:[&_button]:shrink-0 tw:[&_button]:min-h-[40px] tw:[&_label]:font-medium",
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error": sharedUtilities.formError,
} as const;
