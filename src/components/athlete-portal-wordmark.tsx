import { viewStyles } from "./athlete-portal-wordmark.utilities";
export function AthletePortalWordmark() {
  return <svg className={viewStyles.athlete_portal_wordmark} viewBox="0 0 270 64" role="img" aria-label="Portal do Atleta" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="28" cy="25" r="18" stroke="#5be6b4" strokeWidth="3" />
      <path d="M16 13c7 6 16 16 24 24M39 13C32 20 23 29 16 37M24 8c-2 11-2 23 0 34M33 8c2 11 2 23 0 34M16 25h24M28 43l-7 15" stroke="#b8fbe2" strokeWidth="1.7" />
      <path d="M18 59h7" stroke="#5be6b4" strokeWidth="3" />
      <circle cx="51" cy="8" r="4" fill="#54dca9" />
    </g>
    <text x="69" y="28" fill="#f2fbff" fontFamily="Arial, sans-serif" fontSize="23" fontWeight="800" letterSpacing="2.8">PORTAL</text>
    <text x="69" y="52" fill="#69e3b9" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="2">DO ATLETA</text>
  </svg>;
}
