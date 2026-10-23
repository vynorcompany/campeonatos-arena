import type { ReactNode } from "react";

/** Compact operational heading: identity, context and a distinct action area. */
export function WorkspaceHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-5 tw:rounded-2xl tw:border tw:border-[#dce7f2] tw:bg-[linear-gradient(110deg,#edf4ff_0%,#fff_70%)] tw:p-6 tw:viewport-760:p-4">
    <div className="tw:min-w-0 tw:max-w-2xl"><p className="tw:m-0 tw:mb-2 tw:text-[10px] tw:font-bold tw:tracking-[0.16em] tw:text-[#0868e5]">{eyebrow}</p><h1 className="tw:m-0 tw:break-words tw:text-2xl tw:font-bold tw:tracking-tight tw:text-[#132d58]">{title}</h1><p className="tw:m-0 tw:mt-2 tw:text-sm tw:leading-relaxed tw:text-[#607898]">{description}</p></div>
    {children ? <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:viewport-440:w-full tw:viewport-440:[&>*]:grow">{children}</div> : null}
  </header>;
}
