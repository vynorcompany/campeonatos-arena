import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "assistant_chat": [
    "assistant-chat", "tw:grid", "tw:min-h-[min(66vh,_720px)]", "tw:viewport-700:min-h-[70vh]",
    "tw:grid-rows-[minmax(0,_1fr)_auto]", "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:#dce6f2]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:#dce6f2]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dce6f2]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:#dce6f2]", "tw:rounded-[16px]",
    "tw:viewport-700:rounded-[10px]", "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:[box-shadow:0_12px_32px_rgb(26_59_99_/_.08)]",
  ].join(" "),
  "assistant_chat_messages": [
    "assistant-chat-messages", "tw:grid", "tw:[align-content:start]", "tw:gap-y-[12px]",
    "tw:gap-x-[12px]", "tw:min-h-[0]", "tw:max-h-[62vh]", "tw:[overflow-x:auto]",
    "tw:[overflow-y:auto]", "tw:pt-[24px]", "tw:viewport-700:pt-[15px]", "tw:pr-[24px]",
    "tw:viewport-700:pr-[15px]", "tw:pb-[24px]", "tw:viewport-700:pb-[15px]", "tw:pl-[24px]",
    "tw:viewport-700:pl-[15px]", "tw:bg-[color:transparent]", "tw:[background-image:linear-gradient(180deg,_#f8fbff_0%,_#fff_45%)]",
  ].join(" "),
  "assistant_message": [
    "assistant-message", "tw:grid", "tw:gap-y-[5px]", "tw:gap-x-[5px]",
    "tw:w-[min(78%,_680px)]", "tw:viewport-700:w-[92%]", "tw:pt-[13px]", "tw:pr-[15px]",
    "tw:pb-[13px]", "tw:pl-[15px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#dbe6f4]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#dbe6f4]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dbe6f4]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#dbe6f4]", "tw:rounded-[12px]", "tw:bg-[color:#fff]",
    "tw:[background-image:none]", "tw:text-[color:#193456]", "tw:[&_span]:text-[color:#547093]", "tw:[&_span]:text-[.72rem]",
    "tw:[&_span]:font-[800]", "tw:[&_span]:tracking-[.03em]", "tw:[&_p]:mt-[0]", "tw:[&_p]:mr-[0]",
    "tw:[&_p]:mb-[0]", "tw:[&_p]:ml-[0]", "tw:[&_p]:leading-[1.45]", "tw:[&.assistant-message-user]:[justify-self:end]",
    "tw:[&.assistant-message-user]:border-t-[color:#0f64c5]", "tw:[&.assistant-message-user]:border-r-[color:#0f64c5]", "tw:[&.assistant-message-user]:border-b-[color:#0f64c5]", "tw:[&.assistant-message-user]:border-l-[color:#0f64c5]",
    "tw:[&.assistant-message-user]:bg-[color:#0f64c5]", "tw:[&.assistant-message-user]:[background-image:none]", "tw:[&.assistant-message-user]:text-[color:#fff]", "tw:[&.assistant-message-user_span]:text-[color:#dbeaff]",
  ].join(" "),
  "assistant_chat_empty": [
    "assistant-chat-empty", "tw:grid", "tw:gap-y-[7px]", "tw:gap-x-[7px]",
    "tw:place-items-center", "tw:min-h-[360px]", "tw:text-center", "tw:text-[color:#61728b]",
    "tw:[&_strong]:text-[color:#143661]", "tw:[&_strong]:text-[1.05rem]", "tw:[&_span]:max-w-[560px]", "tw:[&_span]:leading-[1.5]",
  ].join(" "),
  "assistant_chat_form": [
    "assistant-chat-form", "tw:grid", "tw:gap-y-[8px]", "tw:gap-x-[8px]",
    "tw:pt-[18px]", "tw:viewport-700:pt-[14px]", "tw:pr-[20px]", "tw:viewport-700:pr-[14px]",
    "tw:pb-[18px]", "tw:viewport-700:pb-[14px]", "tw:pl-[20px]", "tw:viewport-700:pl-[14px]",
    "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:#dce6f2]", "tw:bg-[color:#fff]",
    "tw:[background-image:none]", "tw:[&_label]:text-[color:#26476f]", "tw:[&_label]:text-[.8rem]", "tw:[&_label]:font-[800]",
    "tw:[&_>_div]:grid", "tw:[&_>_div]:grid-cols-[minmax(0,_1fr)_auto]", "tw:viewport-700:[&_>_div]:grid-cols-[1fr]", "tw:[&_>_div]:gap-y-[10px]",
    "tw:[&_>_div]:gap-x-[10px]", "tw:[&_input]:min-w-[0]", "tw:viewport-700:[&_.button]:w-[100%]",
  ].join(" "),
  "button_button_primary": sharedUtilities.buttonButtonPrimary,
  "form_error": sharedUtilities.formError,
} as const;
