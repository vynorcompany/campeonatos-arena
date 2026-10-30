import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
const columns = "tw:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_100px]";
export const viewStyles = {
  permission_profile_create_form: `${ui.form} tw:grid-cols-1!`,
  field: ui.field,
  button_button_primary_button_small: ui.primary,
  standard_list_permission_profiles_list: ui.list,
  standard_list_head: `${ui.head} ${columns}`,
  standard_list_row: `${ui.row} ${columns} tw:text-[#172033] tw:no-underline tw:viewport-760:grid-cols-1 tw:hover:bg-[#1e5ea8] tw:hover:text-white tw:hover:[&_strong]:text-white tw:hover:[&_span]:text-white`,
  permission_profile_members: "tw:min-w-0 tw:break-words tw:whitespace-normal tw:text-xs",
  standard_list_action: "tw:justify-self-start tw:text-xs tw:font-semibold tw:text-[#1e5ea8]",
  standard_list_empty: ui.empty,
} as const;
