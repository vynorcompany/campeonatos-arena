"use client";

import Link from "next/link";
import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTeacherAction } from "@/lib/actions/academy";

type Teacher = { id: string; name: string; phone: string; email: string; active: boolean; studentAssignments: { id: string }[]; planAssignments: { id: string }[] };

function TeacherModal({ close }: { close: () => void }) {
  return <div className="teacher-modal-backdrop" onMouseDown={close}><section className="teacher-modal" role="dialog" aria-modal="true" aria-label="Cadastrar professor" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">PROFESSORES</span><h2>Cadastrar professor</h2></div><button type="button" className="button button-small" onClick={close}>Fechar</button></header><SafeActionForm action={createTeacherAction} className="grid-form" resetOnSuccess successMessage="Professor salvo."><div className="field"><label>Nome<input name="name" required /></label></div><div className="field"><label>Telefone<input name="phone" /></label></div><div className="field"><label>E-mail<input name="email" type="email" /></label></div><div className="field"><label>Meta mensal de aulas<input name="monthlyTarget" type="number" min="0" defaultValue="0" /></label></div><div className="field form-full"><label>Observações<input name="notes" /></label></div><div className="modal-actions form-full"><button type="button" className="button" onClick={close}>Cancelar</button><SubmitButton label="Cadastrar professor" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm></section></div>;
}

export function TeacherManagementWorkspace({ teachers }: { teachers: Teacher[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  return <section className="teacher-directory">
    <div className="teacher-management-toolbar"><h2>Professores</h2><button type="button" className="button button-primary" onClick={() => setCreateOpen(true)}>Cadastrar professor</button></div>
    <div className="teacher-directory-list">{teachers.map((teacher) => <Link href={`/professores/${teacher.id}`} className="teacher-directory-item" key={teacher.id}><div><strong>{teacher.name}</strong><span>{teacher.phone || teacher.email || "Sem contato cadastrado"}</span></div><div><span>{teacher.studentAssignments.length} alunos</span><span>{teacher.planAssignments.length} planos</span><b>Entrar ›</b></div></Link>)}{!teachers.length ? <p className="muted">Nenhum professor cadastrado.</p> : null}</div>
    {createOpen ? <TeacherModal close={() => setCreateOpen(false)} /> : null}
  </section>;
}
