"use client";
import { useState } from "react";
import { availableFixedTimes, type WeeklyRule } from "@/lib/plans/fixed-court";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export type FixedCourt = { id:string; name:string; onlineSlotMinutes:number; weeklyRules:WeeklyRule[] };
export function FixedCourtSchedule({ courts }: { courts:FixedCourt[] }) {
 const [courtId,setCourt]=useState(courts[0]?.id??""),[day,setDay]=useState(1),[duration,setDuration]=useState(90);
 const court=courts.find(c=>c.id===courtId);
 const days=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
 const offered=days.map((name,weekday)=>({name,weekday,times:availableFixedTimes(court?.weeklyRules??[],weekday,duration,court?.onlineSlotMinutes||30)})).filter(d=>d.times.length);
 const chosen=offered.find(d=>d.weekday===day)??offered[0];
 return <><label className={ui.field}>Quadra<select name="courtId" required value={courtId} onChange={e=>setCourt(e.target.value)}><option value="">Selecione</option>{courts.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className={ui.field}>Duração<select name="durationMinutes" value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[30,60,90,120,150,180,240].map(d=><option key={d} value={d}>{d} min</option>)}</select></label><label className={ui.field}>Dia da semana<select name="weekday" required value={chosen?.weekday??""} onChange={e=>setDay(Number(e.target.value))}>{!chosen?<option value="">Sem horários configurados</option>:null}{offered.map(d=><option value={d.weekday} key={d.weekday}>{d.name}</option>)}</select></label><label className={ui.field}>Horário<select name="startMinute" required key={`${courtId}-${chosen?.weekday}-${duration}`} defaultValue=""><option value="">Selecione</option>{chosen?.times.map(m=><option key={m} value={m}>{String(Math.floor(m/60)).padStart(2,"0")}:{String(m%60).padStart(2,"0")}</option>)}</select></label><p className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[var(--muted)]">Conforme a configuração da grade. Conflitos de reservas são conferidos no período completo ao salvar.</p></>;
}
