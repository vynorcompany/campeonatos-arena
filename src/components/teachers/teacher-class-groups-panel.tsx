"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createClassGroupAction, moveTeacherClassGroupStudentAction, updateTeacherClassGroupCapacityAction } from "@/lib/actions/academy";

type Schedule = { id: string; weekday: number; startTime: string; capacity: number };
type Group = { id: string; name: string; schedules: Schedule[]; enrollments: { id: string; student: { id: string; name: string } }[] };
type DraftSchedule = { weekday: string; startTime: string; capacity: string };
const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function TeacherClassGroupsPanel({ teacherId, plans, groups }: { teacherId: string; plans: { id: string; name: string }[]; groups: Group[] }) {
  const [schedules, setSchedules] = useState<DraftSchedule[]>([{ weekday: "1", startTime: "18:00", capacity: "8" }]);
  const [createOpen, setCreateOpen] = useState(false);
  const updateSchedule = (index: number, change: Partial<DraftSchedule>) => setSchedules((current) => current.map((schedule, currentIndex) => currentIndex === index ? { ...schedule, ...change } : schedule));
  const classRows = groups.flatMap((group) => group.schedules.map((schedule) => ({ group, schedule }))).sort((first, second) => first.schedule.weekday - second.schedule.weekday || first.schedule.startTime.localeCompare(second.schedule.startTime));

  return <div className="teacher-groups-panel teacher-class-directory">
    {createOpen ? <section className="section-card teacher-detail-section teacher-class-create-panel">
      <header><div><p className="eyebrow">NOVA TURMA</p><h2>Horários fixos e vagas</h2></div></header>
      {!plans.length ? <p className="muted">Crie ao menos um plano para este professor antes de montar uma turma.</p> : <SafeActionForm action={createClassGroupAction} className="teacher-group-create-form" resetOnSuccess successMessage="Turma criada.">
        <input type="hidden" name="teacherId" value={teacherId} />
        <label>Nome da turma<input name="name" required placeholder="Ex.: Iniciante noite" /></label>
        <fieldset><legend>Plano obrigatório</legend>{plans.map((plan) => <label key={plan.id}><input type="checkbox" name="planIds" value={plan.id} />{plan.name}</label>)}</fieldset>
        <div className="teacher-group-schedules"><div><strong>Horários fixos</strong><span>Dia · Hora · Vagas</span></div>{schedules.map((schedule, index) => <div className="teacher-group-schedule-row" key={`${schedule.weekday}-${index}`}><label>Dia<select name="weekdays" value={schedule.weekday} onChange={(event) => updateSchedule(index, { weekday: event.currentTarget.value })}>{weekdays.map((weekday, value) => <option key={weekday} value={value}>{weekday}</option>)}</select></label><label>Hora<input name="startTimes" type="time" value={schedule.startTime} onChange={(event) => updateSchedule(index, { startTime: event.currentTarget.value })} required /></label><label>Vagas<input name="capacities" type="number" min="1" value={schedule.capacity} onChange={(event) => updateSchedule(index, { capacity: event.currentTarget.value })} required /></label>{schedules.length > 1 ? <button type="button" className="button button-small" onClick={() => setSchedules((current) => current.filter((_, currentIndex) => currentIndex !== index))}>Remover</button> : null}</div>)}<button type="button" className="button button-secondary button-small" onClick={() => setSchedules((current) => [...current, { weekday: "3", startTime: "18:00", capacity: "8" }])}>+ Adicionar horário</button></div>
        <label className="teacher-group-notes">Observações<input name="notes" placeholder="Ex.: turma para iniciantes" /></label>
        <SubmitButton label="Criar turma" pendingLabel="Criando..." className="button button-primary" />
        <button type="button" className="button" onClick={() => setCreateOpen(false)}>Cancelar</button>
      </SafeActionForm>}
    </section> : null}
    <section className="section-card teacher-detail-section teacher-class-list-panel">
      <header><div><h2>Turmas do professor</h2><p className="muted">Gerencie os horários e vagas das turmas.</p></div><button type="button" className="button button-secondary" onClick={() => setCreateOpen(true)}>＋ Nova turma</button></header>
      <div className="teacher-class-row-list">{classRows.map(({ group, schedule }) => <article className="teacher-class-row" key={schedule.id}><span className={`teacher-class-weekday weekday-${schedule.weekday}`}>{weekdays[schedule.weekday].replace("-feira", "")}</span><span className="teacher-class-time"><i aria-hidden="true">◷</i>{schedule.startTime}</span><span className="teacher-class-capacity"><i aria-hidden="true">♧</i><strong>{group.enrollments.length} / {schedule.capacity} vagas</strong></span><details className="teacher-class-actions"><summary aria-label={`Gerenciar ${group.name} em ${schedule.startTime}`}>⋮</summary><div><strong>{group.name}</strong><SafeActionForm action={updateTeacherClassGroupCapacityAction} className="teacher-group-capacity" successMessage="Vagas atualizadas."><input type="hidden" name="teacherId" value={teacherId} /><input type="hidden" name="classGroupId" value={group.id} /><input type="hidden" name="scheduleId" value={schedule.id} /><label>Vagas<input name="capacity" type="number" min={group.enrollments.length || 1} defaultValue={schedule.capacity} /></label><SubmitButton label="Salvar vagas" pendingLabel="..." className="button button-secondary button-small" /></SafeActionForm><div className="teacher-group-students">{group.enrollments.map(({ id, student }) => <div key={id}><strong>{student.name}</strong>{groups.length > 1 ? <SafeActionForm action={moveTeacherClassGroupStudentAction} className="teacher-group-move" successMessage="Aluno movimentado."><input type="hidden" name="teacherId" value={teacherId} /><input type="hidden" name="sourceClassGroupId" value={group.id} /><input type="hidden" name="studentId" value={student.id} /><select name="destinationClassGroupId" defaultValue=""><option value="" disabled>Mover para…</option>{groups.filter((target) => target.id !== group.id).map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select><SubmitButton label="Mover" pendingLabel="..." className="button button-small" /></SafeActionForm> : null}</div>)}{!group.enrollments.length ? <p className="muted">Sem alunos nesta turma.</p> : null}</div></div></details></article>)}{!classRows.length ? <p className="muted teacher-class-empty">Nenhuma turma vinculada a este professor ainda.</p> : null}</div>
      <footer className="teacher-class-footer">Mostrando {classRows.length} horário{classRows.length === 1 ? "" : "s"} em {groups.length} turma{groups.length === 1 ? "" : "s"}</footer>
    </section>
  </div>;
}
