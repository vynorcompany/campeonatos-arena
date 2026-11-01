"use client";
import { useState } from "react";
import { GroupCheckinForm } from "./group-checkin-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { registerCourtCheckinAction, registerLessonQrCheckinAction } from "@/lib/actions/checkin";
type Slot = { id:string;time:string;end:string;courts:{id:string;name:string}[];participants:{playerId:string;name:string;checkedIn:boolean}[] };
type Lesson = {id:string;time:string;title:string;checkedIn:boolean};
const button="tw:cursor-pointer tw:rounded-md tw:border tw:border-[#215da5] tw:bg-[#215da5] tw:px-4 tw:py-2 tw:text-sm tw:font-normal tw:text-white tw:hover:bg-[#174983] tw:disabled:opacity-50";
export function CourtCheckinChooser({arenaSlug,token,playerId,mode,slots,lessons}:{arenaSlug:string;token:string;playerId:string;mode:string;slots:Slot[];lessons:Lesson[]}) {
 const [time,setTime]=useState("");const [court,setCourt]=useState("");
 const times=[...new Set([...slots.map(s=>s.time),...lessons.map(s=>s.time)])].sort();
 const slot=slots.find(s=>s.time===time&&s.courts.some(c=>c.id===court));
 return <div className="tw:grid tw:gap-5">
  <section><h2 className="tw:mb-2 tw:text-sm tw:font-medium">Horário</h2><div className="tw:flex tw:flex-wrap tw:gap-2">{times.map(t=><button key={t} type="button" aria-pressed={time===t} onClick={()=>{setTime(t);setCourt("");}} className={`tw:min-h-10 tw:cursor-pointer tw:rounded-md tw:border tw:px-4 tw:py-2 tw:text-sm ${time===t?"tw:border-[#215da5] tw:bg-[#215da5] tw:text-white":"tw:border-[#c7d7eb] tw:bg-white tw:text-[#17345c]"}`}>{t}</button>)}</div>{!times.length?<p className="tw:text-sm tw:text-slate-600">Nenhum horário disponível para check-in agora.</p>:null}</section>
  {time ? <section><h2 className="tw:mb-2 tw:text-sm tw:font-medium">Quadra</h2><div className="tw:flex tw:flex-wrap tw:gap-2">{slots.filter(s=>s.time===time).flatMap(s=>s.courts).map(c=><button key={c.id} type="button" aria-pressed={court===c.id} onClick={()=>setCourt(c.id)} className={`tw:min-h-10 tw:cursor-pointer tw:rounded-md tw:border tw:px-4 tw:py-2 tw:text-sm ${court===c.id?"tw:border-[#215da5] tw:bg-[#edf4fc] tw:text-[#174983]":"tw:border-[#c7d7eb] tw:bg-white tw:text-[#17345c]"}`}>{c.name}</button>)}</div></section>:null}
  {slot ? <section className="tw:grid tw:gap-3 tw:rounded-lg tw:border tw:border-[#d3dfed] tw:bg-slate-50 tw:p-4"><span className="tw:text-xs tw:text-slate-600">{slot.time}–{slot.end} · {slot.courts.find(c=>c.id===court)?.name}</span>{mode==="GROUP"?<GroupCheckinForm arenaSlug={arenaSlug} token={token} occurrenceId={slot.id} courtId={court} participants={slot.participants} buttonClass={button}/>:slot.participants.find(p=>p.playerId===playerId)?.checkedIn?<p role="status" className="tw:text-sm tw:text-[#174983]">✓ Presença confirmada</p>:<SafeActionForm action={registerCourtCheckinAction} successMessage="Check-in confirmado."><input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="token" value={token}/><input type="hidden" name="occurrenceId" value={slot.id}/><input type="hidden" name="courtId" value={court}/><SubmitButton label="Fazer check-in" pendingLabel="Confirmando…" className={button}/></SafeActionForm>}</section>:null}
  {time?lessons.filter(l=>l.time===time).map(l=><section key={l.id} className="tw:grid tw:gap-3 tw:rounded-lg tw:border tw:border-[#d3dfed] tw:bg-slate-50 tw:p-4"><span className="tw:text-sm">Aula · {l.title}</span>{l.checkedIn?<p role="status" className="tw:text-sm tw:text-[#174983]">✓ Presença confirmada</p>:<SafeActionForm action={registerLessonQrCheckinAction} successMessage="Presença confirmada."><input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="token" value={token}/><input type="hidden" name="lessonId" value={l.id}/><SubmitButton label="Fazer check-in na aula" pendingLabel="Confirmando…" className={button}/></SafeActionForm>}</section>):null}
 </div>;
}
