"use client";

import { useCallback, useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { EventIcon } from "@/components/tournaments/event-icon";
import { createTeacherPlanWithPriceAction } from "@/lib/actions/academy";
import { viewStyles } from "./teacher-plan-create-dialog.utilities";

export type TeacherPlanDraft = { name: string; monthlyPriceCents: number; classesPerMonth: number; notes: string };
const field = "tw:grid tw:min-w-0 tw:gap-2 tw:text-xs tw:font-semibold tw:[&_input]:w-full tw:[&_textarea]:w-full tw:[&_input]:min-w-0 tw:[&_textarea]:min-w-0 tw:[&_textarea]:resize-y";
export const planCopyButton = "tw:inline-flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:text-[var(--brand)] tw:hover:bg-[#174983] tw:hover:text-white tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[var(--brand)] tw:pointer-coarse:size-11";

export function TeacherPlanCreateDialog({ teacherId, initialPlan }: { teacherId: string; initialPlan?: TeacherPlanDraft }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeDialog = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className={initialPlan ? planCopyButton : viewStyles.button_button_primary_button_small_teacher_plan_create_trigger} aria-label={initialPlan ? `Duplicar plano ${initialPlan.name}` : undefined} title={initialPlan ? "Duplicar plano" : undefined} onClick={() => setOpen(true)}>
      {initialPlan ? <svg aria-hidden="true" className="tw:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg> : <><EventIcon name="user-plus" /> Novo plano</>}
    </button>
    <Modal title={initialPlan ? "Duplicar plano" : "Novo plano"} open={open} onClose={closeDialog} width="tw:max-w-[520px]">
        <SafeActionForm action={createTeacherPlanWithPriceAction} className="tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:gap-4" successMessage="Plano criado." onSuccess={() => setOpen(false)}>
          <input type="hidden" name="teacherId" value={teacherId}/>
          <div className="tw:grid tw:min-w-0 tw:gap-4 tw:sm:grid-cols-2"><label className={`${field} tw:sm:col-span-2`}>Nome do plano<input name="name" required minLength={2} maxLength={120} defaultValue={initialPlan ? `${initialPlan.name.slice(0, 112)} (cópia)` : ""} data-modal-autofocus /></label>
          <label className={field}>Aulas por mês<input name="classesPerMonth" type="number" min="0" step="1" required defaultValue={initialPlan?.classesPerMonth ?? 4}/></label>
          <label className={field}>Preço mensal<MoneyInput name="monthlyPrice" required defaultValue={initialPlan ? formatMoneyInput(initialPlan.monthlyPriceCents) : ""}/></label>
          <div className={`${field} tw:sm:col-span-2`}><label htmlFor={`${titleId}-notes`}>Observações</label><textarea id={`${titleId}-notes`} name="notes" rows={3} maxLength={6000} defaultValue={initialPlan?.notes ?? ""}/></div>
          </div><div className="tw:mt-auto tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={viewStyles.button_button_secondary_button_small} onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Criar plano" pendingLabel="Salvando..." className={viewStyles.button_button_primary_button_small}/></div>
        </SafeActionForm>
    </Modal>
  </>;
}
