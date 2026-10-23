import type { ReactNode } from "react";

/** Flat operational heading, following the panel's compact list pages. */
export function WorkspaceHeading({ title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:py-1">
    <div className="tw:min-w-0"><h1 className="tw:m-0 tw:text-lg tw:font-semibold tw:leading-6 tw:text-[var(--ink)]">{title}</h1>{description ? <p className="tw:m-0 tw:mt-1 tw:text-xs tw:leading-5 tw:text-[var(--muted)]">{description}</p> : null}</div>
    {children ? <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{children}</div> : null}
  </header>;
}
