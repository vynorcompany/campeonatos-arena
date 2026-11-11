"use client";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { previewPayslipAction } from "@/lib/actions/payroll-import";
import type { PayslipDraft } from "@/lib/finance/payslip-import";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function PayslipImportDialog({ onImport }: { onImport: (draft: PayslipDraft, fileName: string) => void }) {
  const [open, setOpen] = useState(false), [error, setError] = useState(""), [pending, start] = useTransition();
  return <><button type="button" className={ui.secondary} onClick={() => { setError(""); setOpen(true); }}>Importar holerite</button><Modal title="Importar holerite" open={open} onClose={() => { if (!pending) setOpen(false); }} width="tw:max-w-[560px]" fixedSize={false}>
    <form className="tw:grid tw:min-w-0 tw:gap-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const file = form.get("file") as File; start(async () => { try { const result = await previewPayslipAction(form); if (result.error) setError(result.error); else if (result.draft) { onImport(result.draft, file.name); setOpen(false); } } catch { setError("Não foi possível importar agora. Tente novamente."); } }); }}>
      <label className="tw:grid tw:min-w-0 tw:gap-2 tw:rounded-md tw:border tw:border-dashed tw:border-[#9bb8da] tw:bg-[#edf3fb] tw:p-4 tw:text-sm">Arquivo PDF ou TXT<input className="tw:w-full tw:min-w-0 tw:text-xs" type="file" name="file" accept="application/pdf,text/plain,.pdf,.txt" required disabled={pending}/></label><p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[#354f70]">Até 5 MB e 5 páginas. Confira os valores e o funcionário na próxima tela antes de salvar.</p>{error ? <p role="alert" className="tw:m-0 tw:rounded-md tw:bg-red-50 tw:p-2 tw:text-sm tw:text-red-800">{error}</p> : null}<footer className="tw:flex tw:justify-end tw:gap-2"><button type="button" disabled={pending} className={ui.secondary} onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className={ui.primary} disabled={pending}>{pending ? "Lendo holerite…" : "Ler holerite"}</button></footer>
    </form>
  </Modal></>;
}
