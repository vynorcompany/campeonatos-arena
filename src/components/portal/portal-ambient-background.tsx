/** One compressed asset shared with the hero; cached across Portal sections. */
export function PortalAmbientBackground() {
  return <div aria-hidden="true" className="tw:pointer-events-none tw:fixed tw:inset-0 tw:-z-10 tw:overflow-hidden tw:bg-[#f1f6f2] tw:dark:bg-[#09251f]">
    <img src="/images/padel-night.webp" alt="" decoding="async" className="tw:h-full tw:w-full tw:scale-105 tw:object-cover tw:object-right tw:opacity-20 tw:blur-[3px] tw:dark:opacity-35" />
    <div className="tw:absolute tw:inset-0 tw:bg-[linear-gradient(110deg,rgba(244,248,243,.9),rgba(244,248,243,.52))] tw:dark:bg-[linear-gradient(110deg,rgba(5,27,23,.88),rgba(5,27,23,.35))]" />
  </div>;
}
