import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "entity_actions_cell": [
    "entity-actions-cell", "tw:flex", "tw:min-w-[0]", "tw:items-center",
    "tw:viewport-1024:items-start", "tw:justify-between", "tw:gap-y-[14px]", "tw:gap-x-[14px]",
    "tw:viewport-1024:flex-col",
  ].join(" "),
  "entity_main_text": [
    "entity-main-text", "tw:flex", "tw:min-w-[0]", "tw:flex-col",
    "tw:gap-y-[2px]", "tw:gap-x-[2px]",
  ].join(" "),
  "table_subtext": sharedUtilities.tableSubtext,
  "player_name_tools": [
    "player-name-tools", "tw:inline-flex", "tw:items-center", "tw:gap-y-[6px]",
    "tw:gap-x-[6px]", "tw:[flex-shrink:0]", "tw:relative",
  ].join(" "),
  "player_inline_icon_button": sharedUtilities.playerInlineIconButton,
  "player_trash_button": "player-trash-button tw:inline-flex tw:size-8 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:text-[#b42318] tw:hover:border-[#b42318] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#1e5ea8] tw:[&_svg]:size-4",
} as const;
