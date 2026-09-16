"use client";

import { useMemo, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { scheduleTeacherMakeupAction } from "@/lib/actions/class-groups";

type Student = { id: string; name: string; requestedMakeups: number; pendingMakeups: string[] };
type Slot = { value: string; label: string };

export function TeacherPortalMakeupPlanner({ arenaSlug, students, slots }: { arenaSlug: string; students: Student[]; slots: Slot[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const pending = useMemo(() => students.filter((student) => student.pendingMakeups.length), [students]);
  const toggleStudent = (student: Student) => setSelected((current) => current.some((id) => student.pendingMakeups.includes(id)) ? current.filter((id) => !student.pendingMakeups.includes(id)) : [...current, ...student.pendingMakeups]);
  const awaitingAbsence = students.filter((student) => student.requestedMakeups > student.pendingMakeups.length);
  return <section className="teacher-makeup-planner"><header><span>Reposições solicitadas</span><h3>Agende direto na grade da arena</h3><p>Após a ausência ser registrada, a solicitação fica disponível para agendamento por até 30 dias.</p></header>{awaitingAbsence.length ? <div className="teacher-makeup-awaiting">{awaitingAbsence.map((student) => <small key={student.id}>{student.name}: aguardando a confirmação da ausência.</small>)}</div> : null}{pending.length ? <SafeActionForm action={scheduleTeacherMakeupAction} className="teacher-makeup-form"><input type="hidden" name="arenaSlug" value={arenaSlug} /><div className="teacher-makeup-students">{pending.map((student) => <label key={student.id}><input checked={selected.some((id) => student.pendingMakeups.includes(id))} onChange={() => toggleStudent(student)} type="checkbox" /><span><strong>{student.name}</strong><small>{student.pendingMakeups.length} reposição(ões) pronta(s) para agendar</small></span>{selected.some((id) => student.pendingMakeups.includes(id)) ? student.pendingMakeups.map((id) => <input type="hidden" name="attendanceIds" value={id} key={id} />) : null}</label>)}</div><label className="teacher-makeup-slot"><span>Horário disponível</span><select name="slot" defaultValue="" required><option value="" disabled>Selecione data, horário e quadra</option>{slots.map((slot) => <option value={slot.value} key={slot.value}>{slot.label}</option>)}</select></label><footer><small>{selected.length} ausência(s) selecionada(s)</small><SubmitButton label="Agendar reposição" pendingLabel="Agendando..." className="button button-primary button-small" /></footer></SafeActionForm> : <p className="teacher-portal-empty-filter">Não há reposições confirmadas para agendar.</p>}</section>;
}
