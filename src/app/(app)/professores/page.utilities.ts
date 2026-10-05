import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "teacher_directory_page": [
    "teacher-directory-page", "tw:grid", "tw:gap-y-[24px]", "tw:gap-x-[24px]",
    "tw:w-[min(100%,_1412px)]", "tw:[margin-inline:auto]", "tw:pt-[18px]", "tw:pr-[22px]",
    "tw:pb-[36px]", "tw:pl-[22px]", "tw:max-w-[1320px]",
  ].join(" "),
  "teacher_directory_page_header": [
    "teacher-directory-page-header", "tw:grid", "tw:gap-y-[17px]", "tw:gap-x-[17px]",
    "tw:[&_nav]:flex", "tw:[&_nav]:items-center", "tw:[&_nav]:gap-y-[12px]", "tw:[&_nav]:gap-x-[12px]",
    "tw:[&_nav]:text-[color:#1763c5]", "tw:[&_nav]:text-[.9rem]", "tw:[&_nav_i]:text-[color:#a4b4c8]", "tw:[&_nav_i]:text-[1.35rem]",
    "tw:[&_nav_i]:not-italic", "tw:[&_nav_strong]:text-[color:#0f58b7]", "tw:[&_h1]:mt-[0]", "tw:[&_h1]:mr-[0]",
    "tw:[&_h1]:mb-[0]", "tw:[&_h1]:ml-[0]", "tw:[&_h1]:text-[color:#101d39]", "tw:[&_h1]:text-[clamp(2rem,_3vw,_2.45rem)]",
    "tw:[&_h1]:tracking-[-.055em]", "tw:[&_p]:mt-[7px]", "tw:[&_p]:mr-[0]", "tw:[&_p]:mb-[0]",
    "tw:[&_p]:ml-[0]", "tw:[&_p]:text-[color:#536b88]", "tw:[&_p]:text-[.98rem]",
  ].join(" "),
  "page_breadcrumb": sharedUtilities.pageBreadcrumb,
} as const;
