"use client";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createFinancialSettingAction, updateSupplierAction, deleteSupplierAction } from "@/lib/actions/finance";

type Supplier = { id: string; name: string; document: string; phone: string; email: string; notes: string; active: boolean };
export function SupplierDialog({ supplier }: { supplier?: Supplier }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const title = supplier ? "Editar fornecedor" : "Novo fornecedor";
  return <><button type="button" aria-label={supplier ? `Editar fornecedor ${supplier.name}` : title} className={`${supplier ? ui.secondary : ui.primary} tw:justify-self-start tw:w-fit`} onClick={() => setOpen(true)}>{supplier ? "Editar" : title}</button>
    <Modal open={open} onClose={close} title={title} width="tw:max-w-[600px]">
      <SafeActionForm action={supplier ? updateSupplierAction : createFinancialSettingAction} onSuccess={close} successMessage={supplier ? "Fornecedor atualizado." : "Fornecedor cadastrado."} className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:viewport-620:grid-cols-1 tw:[&_input]:rounded-md!">
        {supplier ? <input type="hidden" name="supplierId" value={supplier.id} /> : <input type="hidden" name="area" value="fornecedores" />}
        <label className={`${ui.field} tw:col-span-full`}>Nome<input name="name" defaultValue={supplier?.name ?? ""} required /></label>
        <label className={ui.field}>CPF/CNPJ<input name="document" defaultValue={supplier?.document ?? ""} /></label>
        <label className={ui.field}>Telefone<input name="phone" defaultValue={supplier?.phone ?? ""} /></label>
        <label className={`${ui.field} tw:col-span-full`}>E-mail<input name="email" type="email" defaultValue={supplier?.email ?? ""} /></label>
        <label className={`${ui.field} tw:col-span-full`}>Observações<input name="notes" defaultValue={supplier?.notes ?? ""} /></label>
        {supplier ? <label className="tw:col-span-full tw:flex tw:items-center tw:gap-2 tw:text-xs"><input name="active" type="checkbox" defaultChecked={supplier.active} />Ativo</label> : null}
        <footer className="tw:col-span-full tw:flex tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar fornecedor" pendingLabel="Salvando..." className={ui.primary} /></footer>
      </SafeActionForm>
      {supplier ? <SafeActionForm action={deleteSupplierAction} onSuccess={close} confirmKeyword="EXCLUIR" confirmPrompt={`Excluir o fornecedor ${supplier.name}? Digite EXCLUIR para confirmar.`}><input type="hidden" name="supplierId" value={supplier.id} /><SubmitButton label="Excluir fornecedor" pendingLabel="Excluindo..." className={`${ui.secondary} tw:text-red-700!`} /></SafeActionForm> : null}
    </Modal></>;
}
