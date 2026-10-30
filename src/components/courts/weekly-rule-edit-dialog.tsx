"use client";

import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { updateCourtWeeklyRuleAction } from "@/lib/actions/calendar";

export function WeeklyRuleEditDialog({ ruleId, startTime, endTime, priceCents, available }: { ruleId: string; startTime: string; endTime: string; priceCents: number; available: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className={ui.secondary} onClick={() => setOpen(true)}>Editar</button>
    {open ? <Modal title="Editar faixa de horário" open onClose={close} width="tw:max-w-[560px]">
      <SafeActionForm action={updateCourtWeeklyRuleAction} onSuccess={close} successMessage="Faixa atualizada." confirmKeyword="ALTERAR" confirmPrompt="Atenção: alterar esta grade de horários pode fazer com que horários já agendados sejam perdidos. Revise os agendamentos afetados e digite ALTERAR para continuar." className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:content-start tw:gap-3 tw:viewport-440:grid-cols-1 tw:[&_label]:grid tw:[&_label]:min-w-0 tw:[&_label]:gap-1.5 tw:[&_label]:text-sm tw:[&_:where(input:not([type=checkbox]))]:min-w-0 tw:[&_:where(input:not([type=checkbox]))]:w-full tw:[&_:where(input:not([type=checkbox]))]:rounded-[7px]!">
        <input type="hidden" name="ruleId" value={ruleId} />
        <label>Início<input name="startTime" type="time" defaultValue={startTime} required /></label>
        <label>Fim<input name="endTime" type="time" defaultValue={endTime} required /></label>
        <label className="tw:col-span-full">Valor por intervalo<MoneyInput name="price" defaultValue={formatMoneyInput(priceCents)} required /></label>
        <label className="tw:col-span-full tw:flex! tw:items-center tw:gap-2"><input name="available" type="checkbox" defaultChecked={available} />Disponível para reserva online</label>
        <footer className="tw:col-span-full tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar faixa" pendingLabel="Salvando..." className={ui.primary} /></footer>
      </SafeActionForm>
    </Modal> : null}
  </>;
}
