"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./teacher-class-groups-panel.utilities";

import { useEffect, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
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
const weekdayOrder = (weekday: number) => (weekday === 0 ? 7 : weekday);
const weekdayAbbreviations = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const getGeneratedClassGroupName = (schedules: DraftSchedule[]) => {
  const firstSchedule = [...schedules].sort(
    (first, second) =>
      weekdayOrder(Number(first.weekday)) - weekdayOrder(Number(second.weekday)) ||
      first.startTime.localeCompare(second.startTime),
  )[0];

  return firstSchedule
    ? `${weekdayAbbreviations[Number(firstSchedule.weekday)]} ${firstSchedule.startTime}`
    : "—";
};

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
    { weekday: "1", startTime: "18:00", capacity: "4" },
  ]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPlanIds, setCreatePlanIds] = useState<string[]>([]);
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
  const openCreate = () => {
    setCreatePlanIds([]);
    setSchedules([{ weekday: "1", startTime: "18:00", capacity: "4" }]);
    setCreateOpen(true);
  };
  const duplicateGroup = (group: Group) => {
    setCreatePlanIds(group.plans.map(({ planId }) => planId));
    setSchedules(
      group.schedules.map((schedule) => ({
        weekday: String(schedule.weekday),
        startTime: schedule.startTime,
        capacity: String(schedule.capacity),
      })),
    );
    setCreateOpen(true);
  };
  useEffect(() => {
    const closeClassActionMenus = (event: PointerEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        target.closest(".teacher-class-actions")
      ) {
        return;
      }
      document
        .querySelectorAll<HTMLDetailsElement>(".teacher-class-actions[open]")
        .forEach((menu) => {
          menu.open = false;
        });
    };
    document.addEventListener("pointerdown", closeClassActionMenus);
    return () =>
      document.removeEventListener("pointerdown", closeClassActionMenus);
  }, []);
  const classRows = groups
    .flatMap((group) =>
      group.schedules.map((schedule) => ({ group, schedule })),
    )
    .sort(
      (first, second) =>
        weekdayOrder(first.schedule.weekday) - weekdayOrder(second.schedule.weekday) ||
        first.schedule.startTime.localeCompare(second.schedule.startTime),
    );

  return (
    <div className={viewStyles.teacher_groups_panel_teacher_class_directory}>
      {createOpen ? (
        <div
          className={viewStyles.teacher_class_create_modal}
          role="presentation"
          onMouseDown={() => setCreateOpen(false)}
        >
          <section
            className={viewStyles.section_card_teacher_detail_section_teacher_class_create_panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-class-create-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className={viewStyles.eyebrow}>NOVA TURMA</p>
                <h2 id="teacher-class-create-title">Horários fixos e vagas</h2>
              </div>
              <button
                type="button"
                className={viewStyles.teacher_class_create_close}
                onClick={() => setCreateOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            {!plans.length ? (
              <p className={viewStyles.muted}>
                Crie ao menos um plano para este professor antes de montar uma
                turma.
              </p>
            ) : (
              <SafeActionForm
                action={createClassGroupAction}
                className={viewStyles.teacher_group_create_form}
                resetOnSuccess
                successMessage="Turma criada."
                onSuccess={() => {
                  setCreateOpen(false);
                  setCreatePlanIds([]);
                }}
                validate={(formData) =>
                  formData.getAll("planIds").length
                    ? null
                    : "Selecione ao menos um plano para a turma."
                }
              >
                <input type="hidden" name="teacherId" value={teacherId} />
                <fieldset>
                  <legend>Plano obrigatório</legend>
                  {plans.map((plan) => (
                    <label key={plan.id}>
                      <input
                        type="checkbox"
                        name="planIds"
                        value={plan.id}
                        defaultChecked={createPlanIds.includes(plan.id)}
                      />
                      {plan.name}
                    </label>
                  ))}
                </fieldset>
                <div className={viewStyles.teacher_group_schedules}>
                  <div>
                    <strong>Horários fixos</strong>
                    <span>Dia · Hora · Vagas</span>
                  </div>
                  {schedules.map((schedule, index) => (
                    <div
                      className={cx(`${viewStyles.teacher_group_schedule_row}${schedules.length > 1 ? " has-remove" : ""}`)}
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
                          max="4"
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
                          className={viewStyles.button_button_small}
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
                    className={viewStyles.button_button_secondary_button_small}
                    onClick={() =>
                      setSchedules((current) => [
                        ...current,
                        { weekday: "3", startTime: "18:00", capacity: "4" },
                      ])
                    }
                  >
                  + Adicionar horário
                  </button>
                  <p className={viewStyles.teacher_group_generated_name}>
                    Nome gerado automaticamente: <strong>{getGeneratedClassGroupName(schedules)}</strong>
                  </p>
                </div>
                <label className={viewStyles.teacher_group_notes}>
                  Observações
                  <input
                    name="notes"
                    placeholder="Ex.: turma para iniciantes"
                  />
                </label>
                <SubmitButton
                  label="Criar turma"
                  pendingLabel="Criando..."
                  className={viewStyles.button_button_primary}
                />
                <button
                  type="button"
                  className={viewStyles.button}
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
          className={viewStyles.teacher_class_create_modal}
          role="presentation"
          onMouseDown={() => setEditingGroupId(null)}
        >
          <section
            className={viewStyles.section_card_teacher_detail_section_teacher_class_create_panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-class-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className={viewStyles.eyebrow}>EDITAR TURMA</p>
                <h2 id="teacher-class-edit-title">Horários, vagas e planos</h2>
              </div>
              <button
                type="button"
                className={viewStyles.teacher_class_create_close}
                onClick={() => setEditingGroupId(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            <SafeActionForm
              action={updateTeacherClassGroupAction}
              className={viewStyles.teacher_group_create_form}
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
              <div className={viewStyles.teacher_group_schedules}>
                <div>
                  <strong>Horários fixos</strong>
                  <span>Dia · Hora · Vagas</span>
                </div>
                {editingSchedules.map((schedule, index) => (
                  <div
                    className={cx(`${viewStyles.teacher_group_schedule_row}${editingSchedules.length > 1 ? " has-remove" : ""}`)}
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
                        max="4"
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
                        className={viewStyles.button_button_small}
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
                  className={viewStyles.button_button_secondary_button_small}
                  onClick={() =>
                    setEditingSchedules((current) => [
                      ...current,
                      { weekday: "3", startTime: "18:00", capacity: "4" },
                    ])
                  }
                >
                + Adicionar horário
                </button>
                <p className={viewStyles.teacher_group_generated_name}>
                  Nome gerado automaticamente: <strong>{getGeneratedClassGroupName(editingSchedules)}</strong>
                </p>
              </div>
              <label className={viewStyles.teacher_group_notes}>
                Observações
                <input name="notes" defaultValue={editingGroup.notes} />
              </label>
              <SubmitButton
                label="Salvar turma"
                pendingLabel="Salvando..."
                className={viewStyles.button_button_primary}
              />
              <button
                type="button"
                className={viewStyles.button}
                onClick={() => setEditingGroupId(null)}
              >
                Cancelar
              </button>
            </SafeActionForm>
          </section>
        </div>
      ) : null}
      <section className={viewStyles.section_card_teacher_detail_section_teacher_class_list_panel}>
        <header>
          <div>
            <h2>Turmas do professor</h2>
            <p className={viewStyles.muted}>Gerencie os horários e vagas das turmas.</p>
          </div>
          <button
            type="button"
            className={viewStyles.button_button_primary_button_small}
            onClick={openCreate}
          >
            <EventIcon name="user-plus" size={15} /> Nova turma
          </button>
        </header>
        <div className={viewStyles.teacher_class_row_list}>
          <div className={viewStyles.teacher_class_list_heading} aria-hidden="true">
            <span>Turma</span>
            <span>Dia e horário</span>
            <span>Vagas</span>
            <span>Ações</span>
          </div>
          {classRows.map(({ group, schedule }) => (
            <article className={viewStyles.teacher_class_row} key={schedule.id}>
              <span className={viewStyles.teacher_class_name}>
                <strong>{group.name}</strong>
                <small>
                  {group.plans.length} plano
                  {group.plans.length === 1 ? "" : "s"}
                </small>
              </span>
              <span className={viewStyles.teacher_class_time}>
                <span
                  className={cx(`${viewStyles.teacher_class_weekday} weekday-${schedule.weekday}`)}
                >
                  {weekdays[schedule.weekday].replace("-feira", "")}
                </span>
                {schedule.startTime}
              </span>
              <span className={viewStyles.teacher_class_capacity}>
                <EventIcon name="users" size={14} />
                <strong>
                  {group.enrollments.length} / {schedule.capacity} vagas
                </strong>
              </span>
              <details className={viewStyles.teacher_class_actions}>
                <summary
                  aria-label={`Gerenciar ${group.name} em ${schedule.startTime}`}
                >
                  ⋮
                </summary>
                <div>
                  <strong>{group.name}</strong>
                  <button
                    type="button"
                    className={viewStyles.button_button_secondary_button_small_2}
                    onClick={() => openEdit(group)}
                  >
                    Editar turma
                  </button>
                  <button
                    type="button"
                    className={viewStyles.button_button_secondary_button_small_2}
                    onClick={() => duplicateGroup(group)}
                  >
                    Duplicar turma
                  </button>
                  <SafeActionForm
                    action={updateTeacherClassGroupCapacityAction}
                    className={viewStyles.teacher_group_capacity}
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
                        max="4"
                        defaultValue={schedule.capacity}
                      />
                    </label>
                    <SubmitButton
                      label="Salvar vagas"
                      pendingLabel="..."
                      className={viewStyles.button_button_secondary_button_small}
                    />
                  </SafeActionForm>
                  <div className={viewStyles.teacher_group_students}>
                    {group.enrollments.map(({ id, student }) => (
                      <div key={id}>
                        <strong>{student.name}</strong>
                        {groups.length > 1 ? (
                          <SafeActionForm
                            action={moveTeacherClassGroupStudentAction}
                            className={viewStyles.teacher_group_move}
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
                              className={viewStyles.button_button_small}
                            />
                          </SafeActionForm>
                        ) : null}
                      </div>
                    ))}
                    {!group.enrollments.length ? (
                      <p className={viewStyles.muted}>Sem alunos nesta turma.</p>
                    ) : null}
                  </div>
                </div>
              </details>
            </article>
          ))}
          {!classRows.length ? (
            <p className={viewStyles.muted_teacher_class_empty}>
              Nenhuma turma vinculada a este professor ainda.
            </p>
          ) : null}
        </div>
        <footer className={viewStyles.teacher_class_footer}>
          Mostrando {classRows.length} horário
          {classRows.length === 1 ? "" : "s"} em {groups.length} turma
          {groups.length === 1 ? "" : "s"}
        </footer>
      </section>
    </div>
  );
}
