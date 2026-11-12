import type { ReactNode } from "react";

const paths = {
  userPlus: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M19 7v6m-3-3h6"/></>,
  settings: <><path d="M3 6h10m4 0h4M3 12h4m4 0h10M3 18h10m4 0h4"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="18" r="2"/></>,
  edit: <><path d="m15 5 4 4M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/></>,
  wallet: <><path d="M20 8V5a2 2 0 0 0-2-2L5 6a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V8"/><path d="M20 13h-5v5h5M17 15.5h.01"/></>,
  plans: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  loyalty: <><circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  reset: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></>,
  merge: <><path d="M5 3v5a7 7 0 0 0 7 7h7M19 3v5a7 7 0 0 1-7 7v6m-4-4 4 4 4-4"/></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/></>,
  upload: <><path d="M12 15V3m-4 4 4-4 4 4M4 16v5h16v-5"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
} satisfies Record<string, ReactNode>;
export type ActionIconName = keyof typeof paths;
export const actionIconButton = "tw:inline-flex tw:size-8 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded tw:border-0 tw:bg-transparent tw:p-0 tw:text-[#215da5] tw:transition-colors tw:hover:bg-[#e6effa] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#215da5] tw:disabled:cursor-not-allowed tw:disabled:opacity-40 tw:pointer-coarse:size-10";
export function ActionIcon({ name }: { name: ActionIconName }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="tw:size-[18px] tw:shrink-0">{paths[name]}</svg>;
}
