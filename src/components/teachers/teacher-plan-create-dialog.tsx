"use client";

import { useEffect, useId, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { EventIcon } from "@/components/tournaments/event-icon";
import { createTeacherPlanWithPriceAction } from "@/lib/actions/academy";
import { viewStyles } from "./teacher-plan-create-dialog.utilities";

export type TeacherPlanDraft = { name: string; monthlyPriceCents: number; classesPerMonth: number; notes: string };
const field = "tw:grid tw:min-w-0 tw:gap-2 tw:text-xs tw:font-semibold tw:[&_input]:w-full tw:[&_textarea]:w-full tw:[&_input]:min-w-0 tw:[&_textarea]:min-w-0 tw:[&_textarea]:resize-y";
export const planCopyButton = "tw:inline-flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:text-[var(--brand)] tw:hover:bg-slate-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[var(--brand)] tw:pointer-coarse:size-11";

export function TeacherPlanCreateDialog({ teacherId, initialPlan }: { teacherId: string; initialPlan?: TeacherPlanDraft }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [open]);
  return <>
    <button type="button" className={initialPlan ? planCopyButton : viewStyles.button_button_primary_button_small_teacher_plan_create_trigger} aria-label={initialPlan ? `Duplicar plano ${initialPlan.name}` : undefined} title={initialPlan ? "Duplicar plano" : undefined} onClick={() => setOpen(true)}>
      {initialPlan ? <svg aria-hidden="true" className="tw:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg> : <><EventIcon name="user-plus" /> Novo plano</>}
    </button>
    {open ? <div className="teacher-plan-edit-modal tw:fixed tw:inset-0 tw:z-[100] tw:grid tw:place-items-center tw:bg-slate-950/40 tw:p-3" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="tw:grid tw:w-full tw:min-w-0 tw:max-w-[520px] tw:h-[min(600px,calc(var(--workspace-viewport-height,100dvh)_-_24px))] tw:content-start tw:max-h-[calc(var(--workspace-viewport-height,100dvh)_-_24px)] tw:gap-4 tw:overflow-y-auto tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-5 tw:shadow-xl" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={event => event.stopPropagation()}>
        <header className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:border-b tw:border-[var(--line)] tw:pb-3"><h2 id={titleId} className="tw:m-0 tw:text-base tw:font-semibold">{initialPlan ? "Duplicar plano" : "Novo plano"}</h2><button type="button" className={planCopyButton} onClick={() => setOpen(false)} aria-label="Fechar">×</button></header>
        <SafeActionForm action={createTeacherPlanWithPriceAction} className="tw:grid tw:min-w-0 tw:gap-4 tw:sm:grid-cols-2" successMessage="Plano criado." onSuccess={() => setOpen(false)}>
          <input type="hidden" name="teacherId" value={teacherId}/>
          <label className={`${field} tw:sm:col-span-2`}>Nome do plano<input name="name" required minLength={2} maxLength={120} defaultValue={initialPlan ? `${initialPlan.name.slice(0, 112)} (cópia)` : ""} autoFocus /></label>
          <label className={field}>Aulas por mês<input name="classesPerMonth" type="number" min="0" step="1" required defaultValue={initialPlan?.classesPerMonth ?? 4}/></label>
          <label className={field}>Preço mensal<MoneyInput name="monthlyPrice" required defaultValue={initialPlan ? formatMoneyInput(initialPlan.monthlyPriceCents) : ""}/></label>
          <div className={`${field} tw:sm:col-span-2`}><label htmlFor={`${titleId}-notes`}>Observações</label><textarea id={`${titleId}-notes`} name="notes" rows={3} maxLength={6000} defaultValue={initialPlan?.notes ?? ""}/></div>
          <div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3 tw:sm:col-span-2"><button type="button" className={viewStyles.button_button_secondary_button_small} onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Criar plano" pendingLabel="Salvando..." className={viewStyles.button_button_primary_button_small}/></div>
        </SafeActionForm>
      </section>
    </div> : null}
  </>;
}
