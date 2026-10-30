"use client";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { MoneyInput } from "@/components/forms/money-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { cancelPlanPriceChangeAction, schedulePlanPriceChangeAction } from "@/lib/actions/teacher-plan-billing";
const money = (value: number) => (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function TeacherPlanPriceSchedule({ teacherId, planId, planName, currentPriceCents, changes }: { teacherId: string; planId: string; planName: string; currentPriceCents: number; changes: { id: string; amountCents: number; effectiveDate: string }[] }) {
  const [open, setOpen] = useState(false); const close = useCallback(() => setOpen(false), []);
  return <><button type="button" className={ui.secondary} onClick={() => setOpen(true)}>Programar reajuste</button>
    <Modal title={`Reajustes · ${planName}`} open={open} onClose={close} width="tw:max-w-[620px]">
      <div className="tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:gap-4">
        <p className="tw:m-0 tw:text-sm">Mensalidade atual: <span className="tw:font-medium">{money(currentPriceCents)}</span></p>
        {changes.length ? <div className="tw:grid tw:gap-2" aria-label="Reajustes programados">{changes.map(change => <div key={change.id} className={`${ui.panel} tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:text-sm`}><span>{change.effectiveDate.split("-").reverse().join("/")} · {money(change.amountCents)}</span><SafeActionForm action={cancelPlanPriceChangeAction} successMessage="Reajuste cancelado."><input type="hidden" name="changeId" value={change.id}/><SubmitButton label="Cancelar reajuste" className={ui.secondary}/></SafeActionForm></div>)}</div> : null}
        <SafeActionForm action={schedulePlanPriceChangeAction} onSuccess={close} successMessage="Reajuste programado. Alunos avisados no Portal." className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:gap-4">
          <input type="hidden" name="teacherId" value={teacherId}/><input type="hidden" name="planId" value={planId}/>
          <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2"><label className={ui.field}>Novo preço mensal<MoneyInput name="amount" required/></label><label className={ui.field}>Vigência<input type="date" name="effectiveDate" required/></label></div>
          <p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">O aviso aparece no Portal dos alunos ativos. Na vigência, o valor do plano, das assinaturas e das mensalidades não pagas é atualizado automaticamente. Pagamentos anteriores são preservados. Boletos emitidos recebem uma diferença separada, sem alterar o documento original.</p>
          <footer className="tw:mt-auto tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Fechar</button><SubmitButton label="Programar e avisar" pendingLabel="Programando..." className={ui.primary}/></footer>
        </SafeActionForm>
      </div>
    </Modal></>;
}
