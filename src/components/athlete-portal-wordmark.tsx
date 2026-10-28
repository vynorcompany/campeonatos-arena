import { viewStyles } from "./athlete-portal-wordmark.utilities";
export function AthletePortalWordmark({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? "tw:block tw:h-9 tw:w-[136px] tw:shrink-0" : viewStyles.athlete_portal_wordmark} viewBox="0 0 270 64" role="img" aria-label="Portal do Atleta" xmlns="http://www.w3.org/2000/svg">
    <image href="/icon.svg?v=padel-blue-3" x="0" y="1" width="60" height="60" />
    <text x="69" y="28" className={compact ? "tw:fill-[#133047] tw:dark:fill-[#f2fbff]" : ""} fill={compact ? undefined : "#f2fbff"} fontFamily="Arial, sans-serif" fontSize="23" fontWeight="800" letterSpacing="2.8">PORTAL</text>
    <text x="69" y="52" className={compact ? "tw:fill-[#08387b] tw:dark:fill-[#8db0e1]" : ""} fill={compact ? undefined : "#699ce3"} fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="2">DO ATLETA</text>
  </svg>;
}
