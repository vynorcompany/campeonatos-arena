import type { ReactNode } from "react";
export function EventEditorSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="tw:grid tw:min-w-0 tw:gap-0 tw:overflow-visible tw:rounded-md tw:border tw:border-[#c7d8eb] tw:bg-white"><h2 className="tw:m-0 tw:rounded-t-[5px] tw:bg-[#174983] tw:px-3 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-white">{title}</h2><div className="tw:grid tw:min-w-0 tw:gap-3 tw:p-3">{children}</div></section>;
}
