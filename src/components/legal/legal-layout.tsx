import type { ReactNode } from "react";
export function LegalLayout({ children }: { children: ReactNode }) {
  return <main className="tw:min-h-dvh tw:bg-[#f5f7fa] tw:text-[#231f20] tw:[--panel:#fff] tw:[--line:#d8e0ea] tw:[--text:#231f20] tw:[--muted:#52677d] tw:dark:bg-[#09251d] tw:dark:text-[#eaf3e9] tw:dark:[--panel:#102d25] tw:dark:[--line:#29483f] tw:dark:[--text:#eaf3e9] tw:dark:[--muted:#aac2b5]"><div className="tw:mx-auto tw:grid tw:w-full tw:max-w-3xl tw:min-w-0 tw:content-start tw:gap-6 tw:px-5 tw:py-10">{children}</div></main>;
}
