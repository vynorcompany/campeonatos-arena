"use client";

import Link from "next/link";
import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
import { createTeacherAction } from "@/lib/actions/academy";

type Teacher = { id: string; name: string; phone: string; email: string; active: boolean; studentAssignments: { id: string }[]; planAssignments: { id: string }[] };

function TeacherModal({ close }: { close: () => void }) {
  return <div className="teacher-modal-backdrop" onMouseDown={close}><section className="teacher-modal" role="dialog" aria-modal="true" aria-label="Cadastrar professor" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">PROFESSORES</span><h2>Cadastrar professor</h2></div><button type="button" className="button button-small" onClick={close}>Fechar</button></header><SafeActionForm action={createTeacherAction} className="grid-form" resetOnSuccess successMessage="Professor salvo."><div className="field"><label>Nome<input name="name" required /></label></div><div className="field"><label>Telefone<input name="phone" /></label></div><div className="field"><label>E-mail<input name="email" type="email" /></label></div><div className="field"><label>Meta mensal de aulas<input name="monthlyTarget" type="number" min="0" defaultValue="0" /></label></div><div className="field form-full"><label>Observações<input name="notes" /></label></div><div className="modal-actions form-full"><button type="button" className="button" onClick={close}>Cancelar</button><SubmitButton label="Cadastrar professor" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm></section></div>;
}

export function TeacherManagementWorkspace({ teachers }: { teachers: Teacher[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [order, setOrder] = useState<"NAME" | "STUDENTS" | "PLANS">("NAME");
  const visibleTeachers = teachers.filter((teacher) => (status === "ALL" || (status === "ACTIVE" ? teacher.active : !teacher.active)) && teacher.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).sort((first, second) => order === "STUDENTS" ? second.studentAssignments.length - first.studentAssignments.length || first.name.localeCompare(second.name, "pt-BR") : order === "PLANS" ? second.planAssignments.length - first.planAssignments.length || first.name.localeCompare(second.name, "pt-BR") : first.name.localeCompare(second.name, "pt-BR"));

  return <section className="teacher-directory">
    <div className="teacher-management-toolbar"><span /><button type="button" className="button button-primary button-small" onClick={() => setCreateOpen(true)}><EventIcon name="user-plus" /> Novo professor</button></div>
    <div className="teacher-directory-filters"><label><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar professor..." aria-label="Buscar professor" /></label><select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")} aria-label="Filtrar por status"><option value="ALL">Status: Todos</option><option value="ACTIVE">Status: Ativos</option><option value="INACTIVE">Status: Inativos</option></select><select value={order} onChange={(event) => setOrder(event.target.value as "NAME" | "STUDENTS" | "PLANS")} aria-label="Ordenar professores"><option value="NAME">Ordenar por: Nome A-Z</option><option value="STUDENTS">Ordenar por: Alunos</option><option value="PLANS">Ordenar por: Planos</option></select></div>
    <div className="teacher-directory-list">{visibleTeachers.map((teacher) => { const initials = teacher.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); const contact = teacher.phone || teacher.email; return <Link href={`/professores/${teacher.id}`} className="teacher-directory-item" key={teacher.id}><span className="teacher-directory-avatar" aria-hidden="true">{initials}</span><div className="teacher-directory-person"><strong>{teacher.name}</strong><span>{contact || "Sem contato cadastrado"}</span></div><span className={teacher.active ? "teacher-directory-status is-active" : "teacher-directory-status"}><i className="teacher-directory-status-dot" aria-hidden="true" />{teacher.active ? "Ativo" : "Inativo"}</span><div className="teacher-directory-metrics"><span className="teacher-directory-metric"><strong>{teacher.studentAssignments.length}</strong><small>Alunos</small></span><span className="teacher-directory-metric"><strong>{teacher.planAssignments.length}</strong><small>Planos</small></span></div><span className="teacher-directory-arrow" aria-label={`Abrir ${teacher.name}`}><EventIcon name="chevron" /></span></Link>; })}{!visibleTeachers.length ? <p className="muted teacher-directory-empty">{teachers.length ? "Nenhum professor encontrado com estes filtros." : "Nenhum professor cadastrado."}</p> : null}</div>
    {teachers.length ? <footer className="teacher-directory-footer"><span>Mostrando {visibleTeachers.length} de {teachers.length} professores</span><div><button type="button" className="button button-small" disabled aria-label="Página anterior">‹</button><b>1</b><button type="button" className="button button-small" disabled aria-label="Próxima página">›</button></div></footer> : null}
    {createOpen ? <TeacherModal close={() => setCreateOpen(false)} /> : null}
  </section>;
}
