import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { consultFocusDocumentAction } from "@/lib/actions/focus-fiscal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function FocusDocumentActions({ id, status }: { id: string; status: string }) {
  return <div className="tw:mt-2 tw:flex tw:flex-wrap tw:gap-2">
    {["PENDING","ERROR","PROCESSING"].includes(status) ? <SafeActionForm action={consultFocusDocumentAction} successMessage="Consulta concluída. Confira a situação da nota."><input type="hidden" name="documentId" value={id}/><SubmitButton label="Consultar / tentar envio" pendingLabel="Consultando…" className={ui.secondary}/></SafeActionForm> : null}
    {status === "AUTHORIZED" ? <details className="tw:w-full"><summary className="tw:w-fit tw:cursor-pointer tw:text-xs tw:text-red-700">Cancelar NFC-e</summary><SafeActionForm action={consultFocusDocumentAction} className="tw:mt-2 tw:flex tw:flex-wrap tw:items-end tw:gap-2" successMessage="Solicitação processada. Confira o resultado fiscal." confirmKeyword="CANCELAR" confirmPrompt="Solicitar o cancelamento fiscal desta nota na Focus? A venda e o recebimento não serão estornados automaticamente."><input type="hidden" name="documentId" value={id}/><label className={ui.field}>Justificativa<input name="cancelReason" minLength={15} maxLength={255} required/></label><SubmitButton label="Solicitar cancelamento" pendingLabel="Cancelando…" className={ui.secondary}/></SafeActionForm></details> : null}
  </div>;
}
