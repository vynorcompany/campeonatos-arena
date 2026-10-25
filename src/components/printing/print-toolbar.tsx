"use client";
import { useState } from "react";
export function PrintToolbar() {
  const [message, setMessage] = useState("");
  return <div className="tw:mx-auto tw:mb-5 tw:grid tw:max-w-xl tw:gap-2 tw:rounded-xl tw:border tw:border-slate-200 tw:bg-white tw:p-4 tw:text-slate-900 tw:print:hidden"><h1 className="tw:m-0 tw:text-lg tw:font-semibold">Prévia de impressão</h1><p className="tw:m-0 tw:text-xs tw:leading-relaxed">Confira a impressora, o tamanho do papel e a escala no diálogo. Para bobinas, use o driver da impressora térmica e margens mínimas.</p><button onClick={() => { window.print(); setMessage("Diálogo de impressão encerrado. Confira a saída na impressora."); }} className="tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border-0 tw:bg-[#145b40] tw:px-5 tw:py-3 tw:text-sm tw:font-semibold tw:text-white">Imprimir</button>{message ? <p role="status" className="tw:m-0 tw:text-xs">{message}</p> : null}</div>;
}
