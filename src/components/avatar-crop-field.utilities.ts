import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "avatar_crop_field": [
    "avatar-crop-field", "tw:grid", "tw:grid-cols-[auto_minmax(0,_1fr)]", "tw:viewport-620:grid-cols-[1fr]",
    "tw:items-center", "tw:gap-y-[12px]", "tw:gap-x-[16px]", "tw:[&_>_small]:[grid-column:2]",
    "tw:viewport-620:[&_>_small]:[grid-column:auto]", "tw:[&_>_small]:mt-[-7px]", "tw:[&_>_small]:text-[color:#6b8291]", "tw:[&_>_small]:text-[.72rem]",
    "tw:[&_>_small]:leading-[1.4]", "tw:viewport-620:[justify-items:start]",
  ].join(" "),
  "avatar_crop_output": [
    "avatar-crop-output", "tw:absolute", "tw:w-[1px]", "tw:h-[1px]",
    "tw:opacity-[0]", "tw:[pointer-events:none]",
  ].join(" "),
  "avatar_crop_preview": [
    "avatar-crop-preview", "tw:relative", "tw:grid", "tw:w-[224px]",
    "tw:viewport-620:w-[180px]", "tw:h-[224px]", "tw:viewport-620:h-[180px]", "tw:place-items-center",
    "tw:[overflow-x:hidden]", "tw:[overflow-y:hidden]", "tw:border-t-[length:3px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:#e6f3f1]", "tw:border-r-[length:3px]", "tw:[border-right-style:solid]", "tw:border-r-[color:#e6f3f1]",
    "tw:border-b-[length:3px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#e6f3f1]", "tw:border-l-[length:3px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:#e6f3f1]", "tw:rounded-[50%]", "tw:bg-[color:transparent]",
    "tw:[background-image:linear-gradient(145deg,_#dfeff3,_#b5d9de)]", "tw:text-[color:#1b6380]", "tw:cursor-grab", "tw:[touch-action:none]",
    "tw:select-none", "tw:[&:active]:cursor-grabbing", "tw:[&_img]:absolute", "tw:[&_img]:max-w-[none]",
    "tw:[&_img]:[object-fit:fill]", "tw:[&_img]:[transform:translate(-50%,_-50%)]", "tw:[&_>_span]:text-[3.2rem]", "tw:[&_>_span]:font-[850]",
    "tw:[&_>_span]:tracking-[-.08em]", "tw:[&_.avatar-crop-current-photo]:top-[0]", "tw:[&_.avatar-crop-current-photo]:right-[0]", "tw:[&_.avatar-crop-current-photo]:bottom-[0]",
    "tw:[&_.avatar-crop-current-photo]:left-[0]", "tw:[&_.avatar-crop-current-photo]:w-[100%]", "tw:[&_.avatar-crop-current-photo]:h-[100%]", "tw:[&_.avatar-crop-current-photo]:[object-fit:cover]",
    "tw:[&_.avatar-crop-current-photo]:[transform:none]",
  ].join(" "),
  "avatar_crop_controls": [
    "avatar-crop-controls", "tw:flex", "tw:items-center", "tw:flex-wrap",
    "tw:gap-y-[7px]", "tw:gap-x-[7px]", "tw:[&_.button]:min-h-[32px]", "tw:[&_label.button]:cursor-pointer",
    "tw:[&_label.button_input]:hidden",
  ].join(" "),
  "button_button_small": sharedUtilities.buttonButtonSmall,
  "avatar_crop_zoom": [
    "avatar-crop-zoom", "tw:flex", "tw:items-center", "tw:gap-y-[7px]",
    "tw:gap-x-[7px]", "tw:text-[color:#587184]", "tw:text-[.72rem]", "tw:font-[750]",
    "tw:[&_input]:w-[130px]", "tw:[&_input]:[accent-color:#087b63]",
  ].join(" "),
} as const;
