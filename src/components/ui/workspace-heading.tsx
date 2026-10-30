import type { ReactNode } from "react";

/** The breadcrumb identifies the page; this component retains accessible titles and page actions. */
export function WorkspaceHeading({ title, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  const heading = <h1 className="tw:sr-only">{title}</h1>;
  return children ? <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2">{heading}{children}</header> : heading;
}
