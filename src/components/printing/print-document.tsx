import { PrintToolbar } from "./print-toolbar";
export function PrintDocument({ paper, copies, children }: { paper: string; copies: number; children: React.ReactNode }) {
  const width = paper === "58MM" ? "tw:w-[58mm]" : paper === "A4" ? "tw:w-[190mm]" : "tw:w-[80mm]";
  return <main data-print-paper={paper} className="tw:min-h-dvh tw:bg-slate-100 tw:p-4 tw:font-mono tw:text-black tw:print:min-h-0 tw:print:bg-white tw:print:p-0"><PrintToolbar/>{Array.from({ length: copies }, (_, index) => <article key={index} className={`${width} tw:mx-auto tw:mb-5 tw:max-w-full tw:break-words tw:bg-white tw:p-[3mm] tw:text-[11px] tw:leading-relaxed tw:shadow-sm tw:print:mb-0 tw:print:shadow-none ${index < copies - 1 ? "tw:break-after-page" : ""}`}>{children}<footer className="tw:mt-4 tw:border-t tw:border-dashed tw:border-black tw:pt-2 tw:text-center tw:text-[9px]">COMPROVANTE NÃO FISCAL · VIA {index + 1}/{copies}</footer></article>)}</main>;
}
