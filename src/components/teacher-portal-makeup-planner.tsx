"use client";

import { useMemo, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { scheduleTeacherMakeupAction } from "@/lib/actions/class-groups";

type Student = { id: string; name: string; pendingMakeups: string[] };
type Slot = { value: string; label: string };

export function TeacherPortalMakeupPlanner({ arenaSlug, students, slots }: { arenaSlug: string; students: Student[]; slots: Slot[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const pending = useMemo(() => students.filter((student) => student.pendingMakeups.length), [students]);
  const toggleStudent = (student: Student) => setSelected((current) => current.some((id) => student.pendingMakeups.includes(id)) ? current.filter((id) => !student.pendingMakeups.includes(id)) : [...current, ...student.pendingMakeups]);
  return <section className="teacher-makeup-planner"><header><span>Reposições pendentes</span><h3>Agende direto na grade da arena</h3><p>Selecione os alunos com ausência pendente e escolha um horário realmente livre.</p></header>{pending.length ? <SafeActionForm action={scheduleTeacherMakeupAction} className="teacher-makeup-form"><input type="hidden" name="arenaSlug" value={arenaSlug} /><div className="teacher-makeup-students">{pending.map((student) => <label key={student.id}><input checked={selected.some((id) => student.pendingMakeups.includes(id))} onChange={() => toggleStudent(student)} type="checkbox" /><span><strong>{student.name}</strong><small>{student.pendingMakeups.length} reposição(ões) pendente(s)</small></span>{selected.some((id) => student.pendingMakeups.includes(id)) ? student.pendingMakeups.map((id) => <input type="hidden" name="attendanceIds" value={id} key={id} />) : null}</label>)}</div><label className="teacher-makeup-slot"><span>Horário disponível</span><select name="slot" defaultValue="" required><option value="" disabled>Selecione data, horário e quadra</option>{slots.map((slot) => <option value={slot.value} key={slot.value}>{slot.label}</option>)}</select></label><footer><small>{selected.length} ausência(s) selecionada(s)</small><SubmitButton label="Agendar reposição" pendingLabel="Agendando..." className="button button-primary button-small" /></footer></SafeActionForm> : <p className="teacher-portal-empty-filter">Não há reposições pendentes para agendar.</p>}</section>;
}
