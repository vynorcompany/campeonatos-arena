"use client";
import { viewStyles } from "./teacher-plan-editor.utilities";

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
        className={viewStyles.teacher_plan_edit_trigger}
        onClick={() => setOpen(true)}
      >
        <EventIcon name="edit" />
        Editar plano
      </button>
      {open ? (
        <div
          className={viewStyles.teacher_plan_edit_modal}
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <section
            className={viewStyles.teacher_plan_edit_dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-plan-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className={viewStyles.eyebrow}>EDITAR PLANO</p>
                <h2 id="teacher-plan-edit-title">{plan.name}</h2>
              </div>
              <button
                type="button"
                className={viewStyles.teacher_plan_edit_close}
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            <SafeActionForm
              action={updateTeacherPlanWithPriceAction}
              className={viewStyles.teacher_plan_edit_form}
              successMessage="Plano atualizado. Os alunos atuais mantêm seus valores contratados."
              onSuccess={() => setOpen(false)}
            >
              <input type="hidden" name="teacherId" value={teacherId} />
              <input type="hidden" name="planId" value={plan.id} />
              <label>
                Preço mensal
                <input
                  name="monthlyPrice"
                  inputMode="decimal"
                  required
                  defaultValue={moneyInput(plan.monthlyPriceCents)}
                />
              </label>
              <div className={viewStyles.teacher_plan_edit_actions}>
                <button
                  type="button"
                  className={viewStyles.button_button_secondary_button_small}
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <SubmitButton
                  label="Salvar plano"
                  pendingLabel="Salvando..."
                  className={viewStyles.button_button_primary_button_small}
                />
              </div>
            </SafeActionForm>
          </section>
        </div>
      ) : null}
    </>
  );
}
