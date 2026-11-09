"use client";
import { useMemo, useState } from "react";
import { useFilterMemory } from "@/components/filters/filter-memory";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { scheduleTeacherMakeupAction } from "@/lib/actions/class-groups";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
type Student={id:string;name:string;requestedMakeups:number;pendingMakeups:string[]};
type Slot={value:string;label:string};
const control="tw:h-9 tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:px-3 tw:text-sm tw:text-[var(--portal-ink)]";
export function TeacherPortalMakeupPlanner({arenaSlug,students,slots}:{arenaSlug:string;students:Student[];slots:Slot[]}) {
 const [selected,setSelected]=useState<string[]>([]),[slot,setSlot]=useState("");
 const [query,setQuery]=useFilterMemory("teacher.makeups.query","");
 const [slotQuery,setSlotQuery]=useFilterMemory("teacher.makeups.slotQuery","");
 const pending=useMemo(()=>students.filter(s=>s.pendingMakeups.length),[students]);
 const normalized=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const visible=pending.filter(s=>normalized(s.name).includes(normalized(query)));
 const availableSlots=slots.filter(s=>normalized(s.label).includes(normalized(slotQuery)));
 const awaiting=students.filter(s=>s.requestedMakeups>s.pendingMakeups.length);
 const valid=selected.filter(id=>pending.some(s=>s.pendingMakeups.includes(id)));
 const visibleIds=visible.flatMap(s=>s.pendingMakeups),all=visibleIds.length>0&&visibleIds.every(id=>valid.includes(id));
 const toggle=(student:Student)=>setSelected(current=>current.some(id=>student.pendingMakeups.includes(id))?current.filter(id=>!student.pendingMakeups.includes(id)):[...new Set([...current,...student.pendingMakeups])]);
 return <section className="tw:grid tw:min-w-0 tw:gap-4 tw:text-[var(--portal-ink)]" aria-label="Agendar reposições">
 {awaiting.length?<details className="tw:rounded-md tw:border tw:border-[var(--portal-line)] tw:p-3"><summary className="tw:cursor-pointer tw:text-xs">{awaiting.length} alunos aguardando confirmação da ausência</summary><ul className="tw:mb-0 tw:grid tw:gap-1 tw:pl-4 tw:text-xs">{awaiting.map(s=><li key={s.id}>{s.name}</li>)}</ul></details>:null}
 {pending.length?<SafeActionForm action={scheduleTeacherMakeupAction} validate={()=>valid.length&&slot?null:"Selecione os alunos e um horário disponível."} className="tw:grid tw:min-w-0 tw:gap-4 tw:min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"><input type="hidden" name="arenaSlug" value={arenaSlug}/>
 <div className="tw:grid tw:min-w-0 tw:content-start tw:gap-3"><label className="tw:grid tw:gap-1 tw:text-xs">Buscar aluno<input type="search" className={control} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome do aluno"/></label><label className="tw:flex tw:items-center tw:gap-2 tw:text-xs"><input type="checkbox" checked={all} onChange={()=>setSelected(current=>all?current.filter(id=>!visibleIds.includes(id)):[...new Set([...current,...visibleIds])])}/>Selecionar alunos exibidos</label><div className="tw:max-h-96 tw:overflow-y-auto tw:rounded-lg tw:border tw:border-[var(--portal-line)]">{visible.map(student=><label key={student.id} className="tw:flex tw:cursor-pointer tw:items-center tw:gap-3 tw:border-b tw:border-[var(--portal-line)] tw:p-3 tw:last:border-0"><input type="checkbox" checked={student.pendingMakeups.some(id=>valid.includes(id))} onChange={()=>toggle(student)}/><span className="tw:min-w-0"><strong className="tw:block tw:text-sm tw:font-medium">{student.name}</strong><small className="tw:mt-1 tw:block tw:text-xs tw:text-[var(--portal-muted)]">{student.pendingMakeups.length} reposições disponíveis</small></span></label>)}{!visible.length?<p className="tw:p-3 tw:text-sm">Nenhum aluno encontrado.</p>:null}</div></div>
 <div className="tw:grid tw:min-w-0 tw:content-start tw:gap-3 tw:rounded-lg tw:border tw:border-[var(--portal-line)] tw:p-4">{valid.map(id=><input type="hidden" name="attendanceIds" key={id} value={id}/>)}<label className="tw:grid tw:gap-1 tw:text-xs">Buscar horário ou quadra<input type="search" className={control} value={slotQuery} onChange={e=>setSlotQuery(e.target.value)} placeholder="Data, horário ou quadra"/></label><label className="tw:grid tw:gap-1 tw:text-xs">Horário disponível<select name="slot" required className={control} value={slot} onChange={e=>setSlot(e.target.value)}><option value="">Selecione o horário</option>{slot&&!availableSlots.some(s=>s.value===slot)?<option value={slot}>{slots.find(s=>s.value===slot)?.label}</option>:null}{availableSlots.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>{!slots.length?<p className="tw:m-0 tw:text-xs">Não há horários disponíveis para reposição.</p>:null}<footer className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-[var(--portal-line)] tw:pt-3"><span className="tw:text-xs">{valid.length} ausências selecionadas</span><SubmitButton disabled={!valid.length||!slot} label="Agendar reposição" pendingLabel="Agendando…" className={ui.primary}/></footer></div>
 </SafeActionForm>:<p className="tw:py-6 tw:text-sm tw:text-[var(--portal-muted)]">Não há reposições confirmadas para agendar.</p>}
 </section>;
}
