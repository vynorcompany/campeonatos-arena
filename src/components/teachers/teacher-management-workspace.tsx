"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTeacherAction, createTeacherPlanAction, createTeacherStudentAction } from "@/lib/actions/academy";

type Teacher = { id: string; name: string; phone: string; email: string; active: boolean; monthlyTarget: number; studentAssignments: { student: { id: string; name: string; remainingClasses: number } }[]; planAssignments: { plan: { id: string; name: string; classesPerMonth: number; monthlyPriceCents: number } }[] };
type Student = { id: string; name: string; remainingClasses: number };
type Plan = { id: string; name: string; classesPerMonth: number; monthlyPriceCents: number };

function Modal({ children, label, close }: { children: React.ReactNode; label: string; close: () => void }) {
  return <div className="teacher-modal-backdrop" onMouseDown={close} onClick={(event) => event.stopPropagation()}><section className="teacher-modal" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => event.stopPropagation()}>{children}</section></div>;
}

export function TeacherManagementWorkspace({ teachers, students, plans }: { teachers: Teacher[]; students: Student[]; plans: Plan[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [activeTeacherId, setActiveTeacherId] = useState(teachers[0]?.id ?? "");
  const activeTeacher = teachers.find((teacher) => teacher.id === activeTeacherId);
  return <section className="teacher-management-workspace">
    <div className="teacher-management-toolbar"><h2>Professores</h2><button type="button" className="button button-primary" onClick={() => setCreateOpen(true)}>Cadastrar professor</button></div>
    <div className="teacher-management-grid">
      <aside className="teacher-management-list">{teachers.map((teacher) => <button type="button" key={teacher.id} className={teacher.id === activeTeacherId ? "teacher-management-list-item is-active" : "teacher-management-list-item"} onClick={() => setActiveTeacherId(teacher.id)}><strong>{teacher.name}</strong><span>{teacher.studentAssignments.length} aluno(s)</span></button>)}{!teachers.length ? <p className="muted">Nenhum professor cadastrado.</p> : null}</aside>
      {activeTeacher ? <main className="teacher-management-detail">
        <header><div><span className="eyebrow">{activeTeacher.active ? "Ativo" : "Inativo"}</span><h2>{activeTeacher.name}</h2><p>{activeTeacher.phone || activeTeacher.email || "Sem contato cadastrado"}</p></div><strong>{activeTeacher.monthlyTarget} aulas/mês</strong></header>
        <div className="teacher-management-sections">
          <section><div className="teacher-management-section-head"><h3>Planos do professor</h3><form action={createTeacherPlanAction}><input type="hidden" name="teacherId" value={activeTeacher.id} /><select name="planId" defaultValue="" required><option value="" disabled>Vincular plano</option>{plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select><SubmitButton label="Vincular" pendingLabel="Salvando..." className="button button-small button-primary" /></form></div><div className="teacher-chip-list">{activeTeacher.planAssignments.map(({ plan }) => <article key={plan.id}><strong>{plan.name}</strong><span>{plan.classesPerMonth} aulas/mês · {(plan.monthlyPriceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></article>)}{!activeTeacher.planAssignments.length ? <p className="muted">Nenhum plano vinculado.</p> : null}</div></section>
          <section><div className="teacher-management-section-head"><h3>Alunos ativos</h3><div className="teacher-student-actions"><button type="button" className="button button-small" onClick={() => setNewStudentOpen(true)}>Novo aluno</button><form action={createTeacherStudentAction}><input type="hidden" name="teacherId" value={activeTeacher.id} /><select name="studentId" defaultValue="" required><option value="" disabled>Vincular aluno</option>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</select><SubmitButton label="Vincular" pendingLabel="Salvando..." className="button button-small button-primary" /></form></div></div><div className="teacher-student-list">{activeTeacher.studentAssignments.map(({ student }) => <article key={student.id}><strong>{student.name}</strong><span>Saldo: {student.remainingClasses} aula(s)</span></article>)}{!activeTeacher.studentAssignments.length ? <p className="muted">Nenhum aluno ativo vinculado.</p> : null}</div></section>
        </div>
      </main> : null}
    </div>
    {createOpen ? <Modal label="Cadastrar professor" close={() => setCreateOpen(false)}><header><div><span className="eyebrow">PROFESSORES</span><h2>Cadastrar professor</h2></div><button type="button" className="button button-small" onClick={() => setCreateOpen(false)}>Fechar</button></header><SafeActionForm action={createTeacherAction} className="grid-form" resetOnSuccess successMessage="Professor salvo."><div className="field"><label>Nome<input name="name" required /></label></div><div className="field"><label>Telefone<input name="phone" /></label></div><div className="field"><label>E-mail<input name="email" type="email" /></label></div><div className="field"><label>Meta mensal de aulas<input name="monthlyTarget" type="number" min="0" defaultValue="0" /></label></div><div className="field form-full"><label>Observações<input name="notes" /></label></div><div className="modal-actions form-full"><button type="button" className="button" onClick={() => setCreateOpen(false)}>Cancelar</button><SubmitButton label="Cadastrar professor" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm></Modal> : null}
    {newStudentOpen && activeTeacher ? <Modal label="Novo aluno" close={() => setNewStudentOpen(false)}><header><div><span className="eyebrow">ALUNOS</span><h2>Novo aluno</h2></div><button type="button" className="button button-small" onClick={() => setNewStudentOpen(false)}>Fechar</button></header><SafeActionForm action={createTeacherStudentAction} className="grid-form" resetOnSuccess successMessage="Aluno criado e vinculado."><input type="hidden" name="teacherId" value={activeTeacher.id} /><div className="field form-full"><label>Nome<input name="newStudentName" required /></label></div><div className="field form-full"><label>Telefone<input name="newStudentPhone" /></label></div><div className="modal-actions form-full"><button type="button" className="button" onClick={() => setNewStudentOpen(false)}>Cancelar</button><SubmitButton label="Criar e vincular" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm></Modal> : null}
  </section>;
}
