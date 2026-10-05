/** Local Tailwind utilities for this component. */
const styles = {
  "page": [
    "arena-connection-page", "tw:w-[100%]", "tw:min-w-[0]",
  ].join(" "),
  "list": [
    "arena-connection-list", "tw:grid", "tw:grid-cols-[repeat(auto-fit,_minmax(270px,_1fr))]", "tw:viewport-620:grid-cols-[1fr]",
    "tw:gap-y-[16px]", "tw:gap-x-[16px]", "tw:items-stretch",
  ].join(" "),
  "card": [
    "arena-connection-card", "tw:flex", "tw:min-w-[0]", "tw:min-h-[182px]",
    "tw:flex-col", "tw:gap-y-[14px]", "tw:gap-x-[14px]", "tw:pt-[18px]",
    "tw:pr-[18px]", "tw:pb-[18px]", "tw:pl-[18px]", "tw:border-t-[length:1px]",
    "tw:[border-top-style:solid]", "tw:border-t-[color:#dce7f1]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]",
    "tw:border-r-[color:#dce7f1]", "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:#dce7f1]",
    "tw:border-l-[length:1px]", "tw:[border-left-style:solid]", "tw:border-l-[color:#dce7f1]", "tw:rounded-[10px]",
    "tw:bg-[color:#fff]", "tw:[background-image:none]", "tw:[transition:border-color_.18s_ease,_box-shadow_.18s_ease]", "tw:hover:border-t-[color:#93b8d4]",
    "tw:hover:border-r-[color:#93b8d4]", "tw:hover:border-b-[color:#93b8d4]", "tw:hover:border-l-[color:#93b8d4]", "tw:hover:[box-shadow:0_8px_20px_rgba(22,_63,_96,_.08)]",
    "tw:[&.arena-connection-card_>_header]:flex", "tw:[&.arena-connection-card_>_header]:items-start", "tw:[&.arena-connection-card_>_header]:justify-between", "tw:[&.arena-connection-card_>_header]:gap-y-[14px]",
    "tw:[&.arena-connection-card_>_header]:gap-x-[14px]", "tw:[&.arena-connection-card_h2]:mt-[5px]", "tw:[&.arena-connection-card_h2]:mr-[0]", "tw:[&.arena-connection-card_h2]:mb-[0]",
    "tw:[&.arena-connection-card_h2]:ml-[0]", "tw:[&.arena-connection-card_p]:mt-[4px]", "tw:[&.arena-connection-card_p]:mr-[0]", "tw:[&.arena-connection-card_p]:mb-[0]",
    "tw:[&.arena-connection-card_p]:ml-[0]", "tw:[&.arena-connection-card_h2]:text-[color:#17385f]", "tw:[&.arena-connection-card_h2]:text-[1rem]", "tw:[&.arena-connection-card_p]:text-[color:#668097]",
    "tw:[&.arena-connection-card_p]:text-[.78rem]", "tw:[&.arena-connection-card_code]:max-w-[115px]", "tw:viewport-620:[&.arena-connection-card_code]:max-w-[100%]", "tw:[&.arena-connection-card_code]:[overflow-x:hidden]",
    "tw:[&.arena-connection-card_code]:[overflow-y:hidden]", "tw:[&.arena-connection-card_code]:pt-[6px]", "tw:[&.arena-connection-card_code]:pr-[8px]", "tw:[&.arena-connection-card_code]:pb-[6px]",
    "tw:[&.arena-connection-card_code]:pl-[8px]", "tw:[&.arena-connection-card_code]:rounded-[6px]", "tw:[&.arena-connection-card_code]:text-[color:#527187]", "tw:[&.arena-connection-card_code]:bg-[color:#f1f6fa]",
    "tw:[&.arena-connection-card_code]:[background-image:none]", "tw:[&.arena-connection-card_code]:text-[.68rem]", "tw:[&.arena-connection-card_code]:text-ellipsis", "tw:[&.arena-connection-card_code]:whitespace-nowrap",
    "tw:[&.arena-connection-card_footer]:grid", "tw:[&.arena-connection-card_footer]:gap-y-[5px]", "tw:[&.arena-connection-card_footer]:gap-x-[5px]", "tw:[&.arena-connection-card_footer]:mt-[auto]",
    "tw:[&.arena-connection-card_footer]:pt-[12px]", "tw:[&.arena-connection-card_footer]:border-t-[length:1px]", "tw:[&.arena-connection-card_footer]:[border-top-style:solid]", "tw:[&.arena-connection-card_footer]:border-t-[color:#e7eef4]",
    "tw:[&.arena-connection-card_footer]:text-[color:#668097]", "tw:[&.arena-connection-card_footer]:text-[.72rem]", "tw:viewport-620:[&.arena-connection-card_>_header]:flex-col",
  ].join(" "),
} as const;
export default styles;
