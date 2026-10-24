import { viewStyles } from "./athlete-portal-wordmark.utilities";
export function AthletePortalWordmark({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? "tw:block tw:h-9 tw:w-[136px] tw:shrink-0" : viewStyles.athlete_portal_wordmark} viewBox="0 0 270 64" role="img" aria-label="Portal do Atleta" xmlns="http://www.w3.org/2000/svg">
    <image href="/icon.svg?v=padel-2" x="0" y="1" width="60" height="60" />
    <text x="69" y="28" className={compact ? "tw:fill-[#133047] tw:dark:fill-[#f2fbff]" : ""} fill={compact ? undefined : "#f2fbff"} fontFamily="Arial, sans-serif" fontSize="23" fontWeight="800" letterSpacing="2.8">PORTAL</text>
    <text x="69" y="52" className={compact ? "tw:fill-[#087b63] tw:dark:fill-[#8de1b7]" : ""} fill={compact ? undefined : "#69e3b9"} fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="2">DO ATLETA</text>
  </svg>;
}
