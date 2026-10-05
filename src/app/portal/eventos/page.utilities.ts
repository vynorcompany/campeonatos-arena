import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "athlete_portal_page": sharedUtilities.athletePortalPage,
  "athlete_portal_hero": sharedUtilities.athletePortalHero,
  "athlete_portal_hero_inner": sharedUtilities.athletePortalHeroInner,
  "athlete_portal_brand": sharedUtilities.athletePortalBrand,
  "athlete_portal_mark": sharedUtilities.athletePortalMark,
  "athlete_portal_brand_copy": sharedUtilities.athletePortalBrandCopy,
  "athlete_portal_profile_link": [
    "athlete-portal-profile-link", "athlete-portal-back-link", "tw:pt-[10px]", "tw:viewport-700:pt-[6px]",
    "tw:pr-[16px]", "tw:viewport-700:pr-[7px]", "tw:pb-[10px]", "tw:viewport-700:pb-[6px]",
    "tw:pl-[16px]", "tw:viewport-700:pl-[7px]", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]",
    "tw:border-t-[color:rgb(134_181_220_/_.26)]", "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:rgb(134_181_220_/_.26)]",
    "tw:border-b-[length:1px]", "tw:[border-bottom-style:solid]", "tw:border-b-[color:rgb(134_181_220_/_.26)]", "tw:border-l-[length:1px]",
    "tw:[border-left-style:solid]", "tw:border-l-[color:rgb(134_181_220_/_.26)]", "tw:rounded-[12px]", "tw:text-[color:#effbff]",
    "tw:bg-[color:transparent]", "tw:[background-image:linear-gradient(135deg,_rgb(22_54_87_/_.9),_rgb(17_40_66_/_.88))]", "tw:text-[.88rem]", "tw:viewport-700:text-[.64rem]",
    "tw:font-[800]", "tw:[text-decoration:none]", "tw:whitespace-nowrap", "tw:min-h-[48px]",
    "tw:viewport-700:min-h-[34px]", "tw:inline-flex", "tw:items-center", "tw:hover:text-[color:#073f68]",
    "tw:hover:bg-[color:#d8ffef]", "tw:hover:[background-image:none]", "tw:viewport-700:ml-[auto]", "tw:viewport-700:[padding-inline:9px]",
  ].join(" "),
} as const;
