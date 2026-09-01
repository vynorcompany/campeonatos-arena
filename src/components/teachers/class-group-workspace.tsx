"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createClassGroupAction } from "@/lib/actions/academy";
import { approveClassGroupRequestAction } from "@/lib/actions/class-groups";

type Schedule = { weekday: string; startTime: string; capacity: string };
type Group = { id: string; name: string; teacher: { name: string }; enrollments: { id: string }[]; schedules: { id: string; weekday: number; startTime: string; capacity: number }[] };
const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

type Request = { id: string; student: { name: string }; classGroup: { name: string; plans: { plan: { id: string; name: string } }[] } };
export function ClassGroupWorkspace({ teachers, plans, groups, requests }: { teachers: { id: string; name: string }[]; plans: { id: string; name: string }[]; groups: Group[]; requests: Request[] }) {
  const [schedules, setSchedules] = useState<Schedule[]>([{ weekday: "1", startTime: "18:00", capacity: "8" }]);
  const updateSchedule = (index: number, change: Partial<Schedule>) => setSchedules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...change } : item));
  return <section className="class-group-workspace">
    <header className="class-group-workspace-header"><div><p className="eyebrow">TURMAS</p><h2>Turmas e horários</h2><p className="muted">Organize professor, planos aceitos e a ocupação de cada encontro fixo.</p></div></header>
    <SafeActionForm action={createClassGroupAction} className="class-group-form" resetOnSuccess successMessage="Turma criada.">
      <label>Nome da turma<input name="name" required placeholder="Ex.: Iniciante noite" /></label>
      <label>Professor<select name="teacherId" required defaultValue=""><option value="" disabled>Selecione</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
      <fieldset className="class-group-plans"><legend>Planos aceitos</legend>{plans.map((plan) => <label key={plan.id}><input type="checkbox" name="planIds" value={plan.id} />{plan.name}</label>)}</fieldset>
      <div className="class-group-schedules"><div className="class-group-schedules-title"><strong>Horários fixos</strong><span>Dia · Hora · Vagas</span></div>{schedules.map((schedule, index) => <div className="class-group-schedule-row" key={index}><label>Dia<select name="weekdays" value={schedule.weekday} onChange={(event) => updateSchedule(index, { weekday: event.currentTarget.value })}>{weekdays.map((weekday, value) => <option key={weekday} value={value}>{weekday}</option>)}</select></label><label>Hora<input name="startTimes" type="time" value={schedule.startTime} onChange={(event) => updateSchedule(index, { startTime: event.currentTarget.value })} required /></label><label>Vagas<input name="capacities" type="number" min="1" value={schedule.capacity} onChange={(event) => updateSchedule(index, { capacity: event.currentTarget.value })} required /></label>{schedules.length > 1 ? <button type="button" className="button button-small" onClick={() => setSchedules((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</button> : null}</div>)}<button type="button" className="button button-secondary button-small" onClick={() => setSchedules((current) => [...current, { weekday: "3", startTime: "18:00", capacity: "8" }])}>+ Adicionar horário</button></div>
      <label className="class-group-notes">Observações<input name="notes" placeholder="Ex.: turma para iniciantes" /></label>
      <SubmitButton label="Criar turma" pendingLabel="Criando..." className="button button-primary" />
    </SafeActionForm>
    <div className="class-group-list">{groups.map((group) => <article key={group.id}><header><div><strong>{group.name}</strong><span>{group.teacher.name}</span></div></header><div>{group.schedules.map((schedule) => <span key={schedule.id}>{weekdays[schedule.weekday]} · {schedule.startTime} · {group.enrollments.length}/{schedule.capacity} vagas</span>)}</div></article>)}{!groups.length ? <p className="muted">Nenhuma turma criada ainda.</p> : null}</div>
    <section className="class-group-requests"><header><strong>Solicitações pendentes</strong><span>{requests.length}</span></header>{requests.map((request) => <SafeActionForm action={approveClassGroupRequestAction} className="class-group-request" key={request.id} successMessage="Matrícula aprovada e cobrança criada."><input type="hidden" name="requestId" value={request.id} /><div><strong>{request.student.name}</strong><span>{request.classGroup.name}</span></div><label>Plano<select name="planId" required defaultValue=""><option value="" disabled>Selecione o plano</option>{request.classGroup.plans.map(({ plan }) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label>Início<input name="startedAt" type="date" required /></label><label>Vencimento<input name="dueDay" type="number" min="1" max="28" defaultValue="10" required /></label><SubmitButton label="Aprovar matrícula" pendingLabel="Aprovando..." className="button button-primary button-small" /></SafeActionForm>)}{!requests.length ? <p className="muted">Nenhuma solicitação aguardando análise.</p> : null}</section>
  </section>;
}
