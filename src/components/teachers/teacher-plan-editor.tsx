"use client";

import { LessonCreditExpiryFields, type ExpiryDraft } from "./lesson-credit-expiry-fields";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
import { updateTeacherPlanWithPriceAction } from "@/lib/actions/academy";

type PlanEditorProps = { teacherId: string; plan: ExpiryDraft & { id: string; name: string; monthlyPriceCents: number } };

export function TeacherPlanEditor({ teacherId, plan }: PlanEditorProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className={ui.secondary} onClick={() => setOpen(true)}><EventIcon name="edit" />Editar plano</button>
    <Modal title={`Editar plano · ${plan.name}`} width="tw:max-w-[560px]" open={open} onClose={close}>
      <SafeActionForm action={updateTeacherPlanWithPriceAction} className="tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:gap-4" successMessage="Plano atualizado. Os alunos atuais mantêm seus valores contratados." onSuccess={close}>
        <input type="hidden" name="teacherId" value={teacherId} />
        <input type="hidden" name="planId" value={plan.id} />
        <label className={ui.field}>Preço mensal<MoneyInput name="monthlyPrice" defaultValue={formatMoneyInput(plan.monthlyPriceCents)} required /></label>
        <LessonCreditExpiryFields value={plan}/><div className="tw:mt-auto tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar plano" pendingLabel="Salvando..." className={ui.primary} /></div>
      </SafeActionForm>
    </Modal>
  </>;
}
