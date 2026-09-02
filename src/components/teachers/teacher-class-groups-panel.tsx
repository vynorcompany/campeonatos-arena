"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  createClassGroupAction,
  moveTeacherClassGroupStudentAction,
  updateTeacherClassGroupAction,
  updateTeacherClassGroupCapacityAction,
} from "@/lib/actions/academy";

type Schedule = {
  id: string;
  weekday: number;
  startTime: string;
  capacity: number;
};
type Group = {
  id: string;
  name: string;
  notes: string;
  plans: { planId: string }[];
  schedules: Schedule[];
  enrollments: { id: string; student: { id: string; name: string } }[];
};
type DraftSchedule = { weekday: string; startTime: string; capacity: string };
const weekdays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function TeacherClassGroupsPanel({
  teacherId,
  plans,
  groups,
}: {
  teacherId: string;
  plans: { id: string; name: string }[];
  groups: Group[];
}) {
  const [schedules, setSchedules] = useState<DraftSchedule[]>([
    { weekday: "1", startTime: "18:00", capacity: "8" },
  ]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingSchedules, setEditingSchedules] = useState<DraftSchedule[]>([]);
  const updateSchedule = (index: number, change: Partial<DraftSchedule>) =>
    setSchedules((current) =>
      current.map((schedule, currentIndex) =>
        currentIndex === index ? { ...schedule, ...change } : schedule,
      ),
    );
  const updateEditingSchedule = (
    index: number,
    change: Partial<DraftSchedule>,
  ) =>
    setEditingSchedules((current) =>
      current.map((schedule, currentIndex) =>
        currentIndex === index ? { ...schedule, ...change } : schedule,
      ),
    );
  const editingGroup = groups.find((group) => group.id === editingGroupId);
  const openEdit = (group: Group) => {
    setEditingSchedules(
      group.schedules.map((schedule) => ({
        weekday: String(schedule.weekday),
        startTime: schedule.startTime,
        capacity: String(schedule.capacity),
      })),
    );
    setEditingGroupId(group.id);
  };
  const classRows = groups
    .flatMap((group) =>
      group.schedules.map((schedule) => ({ group, schedule })),
    )
    .sort(
      (first, second) =>
        first.schedule.weekday - second.schedule.weekday ||
        first.schedule.startTime.localeCompare(second.schedule.startTime),
    );

  return (
    <div className="teacher-groups-panel teacher-class-directory">
      {createOpen ? (
        <div
          className="teacher-class-create-modal"
          role="presentation"
          onMouseDown={() => setCreateOpen(false)}
        >
          <section
            className="section-card teacher-detail-section teacher-class-create-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-class-create-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">NOVA TURMA</p>
                <h2 id="teacher-class-create-title">Horários fixos e vagas</h2>
              </div>
              <button
                type="button"
                className="teacher-class-create-close"
                onClick={() => setCreateOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            {!plans.length ? (
              <p className="muted">
                Crie ao menos um plano para este professor antes de montar uma
                turma.
              </p>
            ) : (
              <SafeActionForm
                action={createClassGroupAction}
                className="teacher-group-create-form"
                resetOnSuccess
                successMessage="Turma criada."
                onSuccess={() => setCreateOpen(false)}
                validate={(formData) =>
                  formData.getAll("planIds").length
                    ? null
                    : "Selecione ao menos um plano para a turma."
                }
              >
                <input type="hidden" name="teacherId" value={teacherId} />
                <label>
                  Nome da turma
                  <input
                    name="name"
                    required
                    placeholder="Ex.: Iniciante noite"
                  />
                </label>
                <fieldset>
                  <legend>Plano obrigatório</legend>
                  {plans.map((plan) => (
                    <label key={plan.id}>
                      <input type="checkbox" name="planIds" value={plan.id} />
                      {plan.name}
                    </label>
                  ))}
                </fieldset>
                <div className="teacher-group-schedules">
                  <div>
                    <strong>Horários fixos</strong>
                    <span>Dia · Hora · Vagas</span>
                  </div>
                  {schedules.map((schedule, index) => (
                    <div
                      className={`teacher-group-schedule-row${schedules.length > 1 ? " has-remove" : ""}`}
                      key={`${schedule.weekday}-${index}`}
                    >
                      <label>
                        Dia
                        <select
                          name="weekdays"
                          value={schedule.weekday}
                          onChange={(event) =>
                            updateSchedule(index, {
                              weekday: event.currentTarget.value,
                            })
                          }
                        >
                          {weekdays.map((weekday, value) => (
                            <option key={weekday} value={value}>
                              {weekday}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Hora
                        <input
                          name="startTimes"
                          type="time"
                          value={schedule.startTime}
                          onChange={(event) =>
                            updateSchedule(index, {
                              startTime: event.currentTarget.value,
                            })
                          }
                          required
                        />
                      </label>
                      <label>
                        Vagas
                        <input
                          name="capacities"
                          type="number"
                          min="1"
                          value={schedule.capacity}
                          onChange={(event) =>
                            updateSchedule(index, {
                              capacity: event.currentTarget.value,
                            })
                          }
                          required
                        />
                      </label>
                      {schedules.length > 1 ? (
                        <button
                          type="button"
                          className="button button-small"
                          onClick={() =>
                            setSchedules((current) =>
                              current.filter(
                                (_, currentIndex) => currentIndex !== index,
                              ),
                            )
                          }
                        >
                          Remover
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() =>
                      setSchedules((current) => [
                        ...current,
                        { weekday: "3", startTime: "18:00", capacity: "8" },
                      ])
                    }
                  >
                    + Adicionar horário
                  </button>
                </div>
                <label className="teacher-group-notes">
                  Observações
                  <input
                    name="notes"
                    placeholder="Ex.: turma para iniciantes"
                  />
                </label>
                <SubmitButton
                  label="Criar turma"
                  pendingLabel="Criando..."
                  className="button button-primary"
                />
                <button
                  type="button"
                  className="button"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </button>
              </SafeActionForm>
            )}
          </section>
        </div>
      ) : null}
      {editingGroup ? (
        <div
          className="teacher-class-create-modal"
          role="presentation"
          onMouseDown={() => setEditingGroupId(null)}
        >
          <section
            className="section-card teacher-detail-section teacher-class-create-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-class-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">EDITAR TURMA</p>
                <h2 id="teacher-class-edit-title">Horários, vagas e planos</h2>
              </div>
              <button
                type="button"
                className="teacher-class-create-close"
                onClick={() => setEditingGroupId(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            <SafeActionForm
              action={updateTeacherClassGroupAction}
              className="teacher-group-create-form"
              successMessage="Turma atualizada."
              onSuccess={() => setEditingGroupId(null)}
              validate={(formData) =>
                formData.getAll("planIds").length
                  ? null
                  : "Selecione ao menos um plano para a turma."
              }
            >
              <input type="hidden" name="teacherId" value={teacherId} />
              <input
                type="hidden"
                name="classGroupId"
                value={editingGroup.id}
              />
              <label>
                Nome da turma
                <input name="name" required defaultValue={editingGroup.name} />
              </label>
              <fieldset>
                <legend>Plano obrigatório</legend>
                {plans.map((plan) => (
                  <label key={plan.id}>
                    <input
                      type="checkbox"
                      name="planIds"
                      value={plan.id}
                      defaultChecked={editingGroup.plans.some(
                        ({ planId }) => planId === plan.id,
                      )}
                    />
                    {plan.name}
                  </label>
                ))}
              </fieldset>
              <div className="teacher-group-schedules">
                <div>
                  <strong>Horários fixos</strong>
                  <span>Dia · Hora · Vagas</span>
                </div>
                {editingSchedules.map((schedule, index) => (
                  <div
                    className={`teacher-group-schedule-row${editingSchedules.length > 1 ? " has-remove" : ""}`}
                    key={`${schedule.weekday}-${index}`}
                  >
                    <label>
                      Dia
                      <select
                        name="weekdays"
                        value={schedule.weekday}
                        onChange={(event) =>
                          updateEditingSchedule(index, {
                            weekday: event.currentTarget.value,
                          })
                        }
                      >
                        {weekdays.map((weekday, value) => (
                          <option key={weekday} value={value}>
                            {weekday}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Hora
                      <input
                        name="startTimes"
                        type="time"
                        value={schedule.startTime}
                        onChange={(event) =>
                          updateEditingSchedule(index, {
                            startTime: event.currentTarget.value,
                          })
                        }
                        required
                      />
                    </label>
                    <label>
                      Vagas
                      <input
                        name="capacities"
                        type="number"
                        min={editingGroup.enrollments.length || 1}
                        value={schedule.capacity}
                        onChange={(event) =>
                          updateEditingSchedule(index, {
                            capacity: event.currentTarget.value,
                          })
                        }
                        required
                      />
                    </label>
                    {editingSchedules.length > 1 ? (
                      <button
                        type="button"
                        className="button button-small"
                        onClick={() =>
                          setEditingSchedules((current) =>
                            current.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          )
                        }
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() =>
                    setEditingSchedules((current) => [
                      ...current,
                      { weekday: "3", startTime: "18:00", capacity: "8" },
                    ])
                  }
                >
                  + Adicionar horário
                </button>
              </div>
              <label className="teacher-group-notes">
                Observações
                <input name="notes" defaultValue={editingGroup.notes} />
              </label>
              <SubmitButton
                label="Salvar turma"
                pendingLabel="Salvando..."
                className="button button-primary"
              />
              <button
                type="button"
                className="button"
                onClick={() => setEditingGroupId(null)}
              >
                Cancelar
              </button>
            </SafeActionForm>
          </section>
        </div>
      ) : null}
      <section className="section-card teacher-detail-section teacher-class-list-panel">
        <header>
          <div>
            <h2>Turmas do professor</h2>
            <p className="muted">Gerencie os horários e vagas das turmas.</p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setCreateOpen(true)}
          >
            ＋ Nova turma
          </button>
        </header>
        <div className="teacher-class-row-list">
          {classRows.map(({ group, schedule }) => (
            <article className="teacher-class-row" key={schedule.id}>
              <span
                className={`teacher-class-weekday weekday-${schedule.weekday}`}
              >
                {weekdays[schedule.weekday].replace("-feira", "")}
              </span>
              <span className="teacher-class-time">
                <i aria-hidden="true">◷</i>
                {schedule.startTime}
              </span>
              <span className="teacher-class-capacity">
                <i aria-hidden="true">♧</i>
                <strong>
                  {group.enrollments.length} / {schedule.capacity} vagas
                </strong>
              </span>
              <details className="teacher-class-actions">
                <summary
                  aria-label={`Gerenciar ${group.name} em ${schedule.startTime}`}
                >
                  ⋮
                </summary>
                <div>
                  <strong>{group.name}</strong>
                  <button
                    type="button"
                    className="button button-secondary button-small teacher-class-edit-trigger"
                    onClick={() => openEdit(group)}
                  >
                    Editar turma
                  </button>
                  <SafeActionForm
                    action={updateTeacherClassGroupCapacityAction}
                    className="teacher-group-capacity"
                    successMessage="Vagas atualizadas."
                  >
                    <input type="hidden" name="teacherId" value={teacherId} />
                    <input type="hidden" name="classGroupId" value={group.id} />
                    <input
                      type="hidden"
                      name="scheduleId"
                      value={schedule.id}
                    />
                    <label>
                      Vagas
                      <input
                        name="capacity"
                        type="number"
                        min={group.enrollments.length || 1}
                        defaultValue={schedule.capacity}
                      />
                    </label>
                    <SubmitButton
                      label="Salvar vagas"
                      pendingLabel="..."
                      className="button button-secondary button-small"
                    />
                  </SafeActionForm>
                  <div className="teacher-group-students">
                    {group.enrollments.map(({ id, student }) => (
                      <div key={id}>
                        <strong>{student.name}</strong>
                        {groups.length > 1 ? (
                          <SafeActionForm
                            action={moveTeacherClassGroupStudentAction}
                            className="teacher-group-move"
                            successMessage="Aluno movimentado."
                          >
                            <input
                              type="hidden"
                              name="teacherId"
                              value={teacherId}
                            />
                            <input
                              type="hidden"
                              name="sourceClassGroupId"
                              value={group.id}
                            />
                            <input
                              type="hidden"
                              name="studentId"
                              value={student.id}
                            />
                            <select
                              name="destinationClassGroupId"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Mover para…
                              </option>
                              {groups
                                .filter((target) => target.id !== group.id)
                                .map((target) => (
                                  <option key={target.id} value={target.id}>
                                    {target.name}
                                  </option>
                                ))}
                            </select>
                            <SubmitButton
                              label="Mover"
                              pendingLabel="..."
                              className="button button-small"
                            />
                          </SafeActionForm>
                        ) : null}
                      </div>
                    ))}
                    {!group.enrollments.length ? (
                      <p className="muted">Sem alunos nesta turma.</p>
                    ) : null}
                  </div>
                </div>
              </details>
            </article>
          ))}
          {!classRows.length ? (
            <p className="muted teacher-class-empty">
              Nenhuma turma vinculada a este professor ainda.
            </p>
          ) : null}
        </div>
        <footer className="teacher-class-footer">
          Mostrando {classRows.length} horário
          {classRows.length === 1 ? "" : "s"} em {groups.length} turma
          {groups.length === 1 ? "" : "s"}
        </footer>
      </section>
    </div>
  );
}
