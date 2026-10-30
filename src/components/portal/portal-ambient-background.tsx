/** One compressed asset shared with the hero; cached across Portal sections. */
export function PortalAmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="tw:pointer-events-none tw:fixed tw:inset-0 tw:-z-10 tw:overflow-hidden tw:bg-white tw:dark:bg-[#091525]"
    >
      <img
        src="/images/padel-night.webp"
        alt=""
        decoding="async"
        loading="lazy"
        className="tw:hidden tw:dark:block tw:h-full tw:w-full tw:scale-105 tw:object-cover tw:object-right tw:opacity-35 tw:blur-[3px]"
      />
      <div className="tw:absolute tw:inset-0 tw:hidden tw:dark:block tw:bg-[linear-gradient(110deg,rgba(5,14,27,.88),rgba(5,14,27,.35))]" />
    </div>
  );
}
