"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
import { updateTeacherPlanWithPriceAction } from "@/lib/actions/academy";

type PlanEditorProps = {
  teacherId: string;
  plan: {
    id: string;
    name: string;
    classesPerMonth: number;
    monthlyPriceCents: number;
  };
};

const moneyInput = (value: number) =>
  (value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function TeacherPlanEditor({ teacherId, plan }: PlanEditorProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="teacher-plan-edit-trigger"
        onClick={() => setOpen(true)}
      >
        <EventIcon name="edit" />
        Editar plano
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
            aria-labelledby="teacher-plan-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">EDITAR PLANO</p>
                <h2 id="teacher-plan-edit-title">{plan.name}</h2>
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
              action={updateTeacherPlanWithPriceAction}
              className="teacher-plan-edit-form"
              successMessage="Plano atualizado. Os alunos atuais mantêm seus valores contratados."
              onSuccess={() => setOpen(false)}
            >
              <input type="hidden" name="teacherId" value={teacherId} />
              <input type="hidden" name="planId" value={plan.id} />
              <label>
                Nome do plano
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={plan.name}
                />
              </label>
              <label>
                Aulas/mês
                <input
                  name="classesPerMonth"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={plan.classesPerMonth}
                />
              </label>
              <label>
                Preço mensal
                <input
                  name="monthlyPrice"
                  inputMode="decimal"
                  required
                  defaultValue={moneyInput(plan.monthlyPriceCents)}
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
                  label="Salvar plano"
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
