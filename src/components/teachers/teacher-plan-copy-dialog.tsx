"use client";
import { viewStyles } from "./teacher-plan-copy-dialog.utilities";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
import { copyTeacherPlansAction } from "@/lib/actions/academy";

type TargetTeacher = { id: string; name: string };

export function TeacherPlanCopyDialog({
  teacherId,
  teachers,
}: {
  teacherId: string;
  teachers: TargetTeacher[];
}) {
  const [open, setOpen] = useState(false);

  if (!teachers.length) return null;

  return (
    <>
      <button
        type="button"
        className={viewStyles.button_button_secondary_button_small_teacher_plan_copy_trigger}
        onClick={() => setOpen(true)}
      >
        <EventIcon name="clipboard" size={15} /> Copiar planos
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
            aria-labelledby="teacher-plan-copy-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className={viewStyles.eyebrow}>PLANOS DO PROFESSOR</p>
                <h2 id="teacher-plan-copy-title">Copiar planos</h2>
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
              action={copyTeacherPlansAction}
              className={viewStyles.teacher_plan_edit_form}
              successMessage="Planos copiados para o professor selecionado."
              onSuccess={() => setOpen(false)}
            >
              <input type="hidden" name="sourceTeacherId" value={teacherId} />
              <label>
                Copiar para
                <select name="targetTeacherId" required defaultValue="">
                  <option value="" disabled>
                    Selecione o professor
                  </option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className={viewStyles.teacher_plan_copy_note}>
                Copia apenas os planos ativos. Alunos e turmas não são alterados.
              </p>
              <div className={viewStyles.teacher_plan_edit_actions}>
                <button
                  type="button"
                  className={viewStyles.button_button_secondary_button_small}
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <SubmitButton
                  label="Copiar planos"
                  pendingLabel="Copiando..."
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
