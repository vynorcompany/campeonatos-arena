/** Shared photographic depth for the Portal hero and the arena check-in. */
export function PadelBackdrop({ fixed = false }: { fixed?: boolean }) {
  return <div aria-hidden="true" className={`${fixed ? "tw:fixed" : "tw:absolute"} tw:inset-0 tw:-z-10 tw:overflow-hidden`}>
    <img src="/images/padel-night.webp" alt="" className={`tw:h-full tw:w-full tw:scale-105 tw:object-cover tw:blur-[2px] ${fixed ? "tw:object-[85%_center]" : "tw:object-[65%_center]"}`} />
    <div className="tw:absolute tw:inset-0 tw:bg-[linear-gradient(105deg,rgba(2,11,24,.94),rgba(4,17,35,.75)_48%,rgba(5,16,31,.3))]" />
  </div>;
}
