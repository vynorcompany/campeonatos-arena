import Image from "next/image";

/** The product mark stays separate from the arena's own identity. */
export function AthletePortalWordmark({ compact = false, surface = compact ? "adaptive" : "dark" }: { compact?: boolean; surface?: "light" | "dark" | "adaptive" }) {
  const size = compact ? "tw:w-[104px] tw:max-w-full" : "tw:w-[208px] tw:max-w-full";
  const imageClass = "tw:block tw:h-auto tw:w-full tw:object-contain";
  return <span className={`athlete-portal-wordmark tw:block tw:shrink-0 ${size}`}>
    {surface !== "dark" ? <Image src="/brand/vx4-logo-light.svg" alt="VX4" width={900} height={400} className={`${imageClass}${surface === "adaptive" ? " tw:dark:hidden" : ""}`} unoptimized /> : null}
    {surface !== "light" ? <Image src="/brand/vx4-logo.svg" alt="VX4" width={900} height={400} className={`${imageClass}${surface === "adaptive" ? " tw:hidden tw:dark:block" : ""}`} unoptimized /> : null}
  </span>;
}
