import type { ReactNode } from "react";
export function ServiceEditorSection({title,children}:{title:string;children:ReactNode}) {
  return <fieldset className="tw:m-0 tw:grid tw:min-w-0 tw:gap-3 tw:border-0 tw:border-b tw:border-[#d8e3ef] tw:p-0 tw:pb-4 tw:last:border-0"><legend className="tw:mb-3 tw:w-full tw:text-xs tw:font-medium tw:text-[#174983]">{title}</legend>{children}</fieldset>;
}
