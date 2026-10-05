"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./teacher-management-workspace.utilities";

import Link from "next/link";
import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
import { PlayerAvatar } from "@/components/player-avatar";
import { createTeacherAction } from "@/lib/actions/academy";

type Teacher = { id: string; name: string; phone: string; email: string; active: boolean; player: { photoUrl: string } | null; studentAssignments: { id: string }[]; planAssignments: { id: string }[] };
type Client = { id: string; name: string; phone: string; email: string };

function TeacherModal({ clients, close }: { clients: Client[]; close: () => void }) {
  const [playerId, setPlayerId] = useState("");
  const client = clients.find((item) => item.id === playerId);

  return <div className={viewStyles.teacher_modal_backdrop} onMouseDown={close}><section className={viewStyles.teacher_modal} role="dialog" aria-modal="true" aria-label="Cadastrar professor" onMouseDown={(event) => event.stopPropagation()}><header><div><span className={viewStyles.eyebrow}>PROFESSORES</span><h2>Cadastrar professor</h2></div><button type="button" className={viewStyles.button_button_small} onClick={close}>Fechar</button></header><SafeActionForm action={createTeacherAction} className={viewStyles.grid_form} resetOnSuccess successMessage="Professor salvo."><div className={viewStyles.field_form_full}><label>Cliente<select name="playerId" required value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="" disabled>Selecione um cliente</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}{item.phone ? ` · ${item.phone}` : ""}</option>)}</select></label></div><div className={viewStyles.field}><label>Nome<input value={client?.name ?? ""} readOnly placeholder="Selecionado a partir do cliente" /></label></div><div className={viewStyles.field}><label>Telefone<input value={client?.phone ?? ""} readOnly placeholder="Selecionado a partir do cliente" /></label></div><div className={viewStyles.field}><label>E-mail<input value={client?.email ?? ""} readOnly placeholder="Selecionado a partir do cliente" /></label></div><div className={viewStyles.field}><label>Meta mensal de aulas<input name="monthlyTarget" type="number" min="0" defaultValue="0" /></label></div><div className={viewStyles.field_form_full}><label>Observações<input name="notes" /></label></div><div className={viewStyles.modal_actions_form_full}><button type="button" className={viewStyles.button} onClick={close}>Cancelar</button><SubmitButton label="Cadastrar professor" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div></SafeActionForm></section></div>;
}

export function TeacherManagementWorkspace({ teachers, clients }: { teachers: Teacher[]; clients: Client[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [order, setOrder] = useState<"NAME" | "STUDENTS" | "PLANS">("NAME");
  const visibleTeachers = teachers.filter((teacher) => (status === "ALL" || (status === "ACTIVE" ? teacher.active : !teacher.active)) && teacher.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).sort((first, second) => order === "STUDENTS" ? second.studentAssignments.length - first.studentAssignments.length || first.name.localeCompare(second.name, "pt-BR") : order === "PLANS" ? second.planAssignments.length - first.planAssignments.length || first.name.localeCompare(second.name, "pt-BR") : first.name.localeCompare(second.name, "pt-BR"));

  return <section className={viewStyles.teacher_directory}>
    <div className={viewStyles.teacher_management_toolbar}><span /><button type="button" className={viewStyles.button_button_primary_button_small} onClick={() => setCreateOpen(true)}><EventIcon name="user-plus" /> Novo professor</button></div>
    <div className={viewStyles.teacher_directory_filters}><label><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar professor..." aria-label="Buscar professor" /></label><select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")} aria-label="Filtrar por status"><option value="ALL">Status: Todos</option><option value="ACTIVE">Status: Ativos</option><option value="INACTIVE">Status: Inativos</option></select><select value={order} onChange={(event) => setOrder(event.target.value as "NAME" | "STUDENTS" | "PLANS")} aria-label="Ordenar professores"><option value="NAME">Ordenar por: Nome A-Z</option><option value="STUDENTS">Ordenar por: Alunos</option><option value="PLANS">Ordenar por: Planos</option></select></div>
    <div className={viewStyles.teacher_directory_list}>{visibleTeachers.map((teacher) => { const contact = teacher.phone || teacher.email; return <Link href={`/professores/${teacher.id}`} className={viewStyles.teacher_directory_item} key={teacher.id}><PlayerAvatar className={viewStyles.teacher_directory_avatar} photoUrl={teacher.player?.photoUrl ?? ""} name={teacher.name} /><div className={viewStyles.teacher_directory_person}><strong>{teacher.name}</strong><span>{contact || "Sem contato cadastrado"}</span></div><span className={cx(teacher.active ? viewStyles.teacher_directory_status : viewStyles.teacher_directory_status_2)}><i className={viewStyles.teacher_directory_status_dot} aria-hidden="true" />{teacher.active ? "Ativo" : "Inativo"}</span><div className={viewStyles.teacher_directory_metrics}><span className={viewStyles.teacher_directory_metric}><strong>{teacher.studentAssignments.length}</strong><small>Alunos</small></span><span className={viewStyles.teacher_directory_metric}><strong>{teacher.planAssignments.length}</strong><small>Planos</small></span></div><span className={viewStyles.teacher_directory_arrow} aria-label={`Abrir ${teacher.name}`}><EventIcon name="chevron" /></span></Link>; })}{!visibleTeachers.length ? <p className={viewStyles.muted_teacher_directory_empty}>{teachers.length ? "Nenhum professor encontrado com estes filtros." : "Nenhum professor cadastrado."}</p> : null}</div>
    {teachers.length ? <footer className={viewStyles.teacher_directory_footer}><span>Mostrando {visibleTeachers.length} de {teachers.length} professores</span><div><button type="button" className={viewStyles.button_button_small} disabled aria-label="Página anterior">‹</button><b>1</b><button type="button" className={viewStyles.button_button_small} disabled aria-label="Próxima página">›</button></div></footer> : null}
    {createOpen ? <TeacherModal clients={clients} close={() => setCreateOpen(false)} /> : null}
  </section>;
}
