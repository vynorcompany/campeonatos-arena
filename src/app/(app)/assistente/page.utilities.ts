import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "workspace_page_assistant_page": "workspace-page assistant-page tw:grid tw:w-full tw:min-w-0 tw:gap-4 tw:pb-4",
  "page_breadcrumb": sharedUtilities.pageBreadcrumb,
} as const;
