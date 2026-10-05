/** Tailwind component utilities; marker classes only identify local state. */
const styles = {
  page: [
    "arena-connection-page tw:w-[100%] tw:min-w-[0]",
  ].join(" "),
  list: [
    "arena-connection-list tw:grid tw:grid-cols-[repeat(auto-fit,_minmax(270px,_1fr))] tw:gap-[16px]",
    "tw:items-stretch tw:viewport-620:grid-cols-[1fr]",
  ].join(" "),
  card: [
    "arena-connection-card tw:flex tw:min-w-[0] tw:min-h-[182px]",
    "tw:flex-col tw:gap-[14px] tw:[padding:18px] tw:[border:1px_solid_#dce7f1]",
    "tw:rounded-[10px] tw:[background:#fff] tw:[transition:border-color_.18s_ease,_box-shadow_.18s_ease] tw:[&:hover]:[border-color:#93b8d4]",
    "tw:[&:hover]:[box-shadow:0_8px_20px_rgba(22,_63,_96,_.08)] tw:[&_>_header]:flex tw:[&_>_header]:items-start tw:[&_>_header]:justify-between",
    "tw:[&_>_header]:gap-[14px] tw:[&_h2]:[margin:0] tw:[&_p]:[margin:0] tw:[&_h2]:[margin-top:5px]",
    "tw:[&_h2]:[color:#17385f] tw:[&_h2]:text-[1rem] tw:[&_p]:[margin-top:4px] tw:[&_p]:[color:#668097]",
    "tw:[&_p]:text-[.78rem] tw:[&_code]:max-w-[115px] tw:[&_code]:overflow-hidden tw:[&_code]:[padding:6px_8px]",
    "tw:[&_code]:rounded-[6px] tw:[&_code]:[color:#527187] tw:[&_code]:[background:#f1f6fa] tw:[&_code]:text-[.68rem]",
    "tw:[&_code]:text-ellipsis tw:[&_code]:whitespace-nowrap tw:[&_footer]:grid tw:[&_footer]:gap-[5px]",
    "tw:[&_footer]:[margin-top:auto] tw:[&_footer]:[padding-top:12px] tw:[&_footer]:[border-top:1px_solid_#e7eef4] tw:[&_footer]:[color:#668097]",
    "tw:[&_footer]:text-[.72rem] tw:viewport-620:[&_>_header]:items-start tw:viewport-620:[&_>_header]:flex-col tw:viewport-620:[&_code]:max-w-[100%]",
  ].join(" "),
} as const;

export default styles;
