"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
import { createTeacherPlanWithPriceAction } from "@/lib/actions/academy";

export function TeacherPlanCreateDialog({ teacherId, plans }: { teacherId: string; plans: { id: string; name: string; classesPerMonth: number }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="button button-primary button-small teacher-plan-create-trigger"
        onClick={() => setOpen(true)}
      >
        <EventIcon name="user-plus" /> Novo plano
      </button>
      {open ? (
        <div
          className="teacher-plan-edit-modal"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <section
            className="teacher-plan-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-plan-create-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">NOVO PLANO</p>
                <h2 id="teacher-plan-create-title">Vincular plano e preço mensal</h2>
              </div>
              <button
                type="button"
                className="teacher-plan-edit-close"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            <SafeActionForm
              action={createTeacherPlanWithPriceAction}
              className="teacher-plan-edit-form"
              resetOnSuccess
              successMessage="Plano criado e vinculado ao professor."
              onSuccess={() => setOpen(false)}
            >
              <input type="hidden" name="teacherId" value={teacherId} />
              <label>
                Plano padrão
                <select name="planId" required defaultValue="">
                  <option value="" disabled>Selecione o plano padrão</option>
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.classesPerMonth} aulas/mês</option>)}
                </select>
              </label>
              <label>
                Preço mensal
                <input
                  name="monthlyPrice"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                />
              </label>
              <div className="teacher-plan-edit-actions">
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <SubmitButton
                  label="Vincular plano"
                  pendingLabel="Salvando..."
                  className="button button-primary button-small"
                />
              </div>
            </SafeActionForm>
          </section>
        </div>
      ) : null}
    </>
  );
}
