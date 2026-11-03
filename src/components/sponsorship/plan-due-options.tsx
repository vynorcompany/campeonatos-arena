"use client";
import { useState } from "react";
export function PlanDueOptions({ defaults=[5,10,15] }: { defaults?: number[] }) {
 const [days,setDays]=useState(defaults),[day,setDay]=useState(20);
 return <fieldset className="tw:col-span-full tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--line)] tw:p-3"><legend className="tw:px-1 tw:text-xs">Vencimentos disponíveis</legend><input type="hidden" name="dueOptionsConfigured" value="1"/><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{days.map(d=><label key={d} className="tw:flex tw:items-center tw:gap-1.5 tw:text-xs"><input name="dueDays" type="checkbox" value={d} defaultChecked/>Dia {d}</label>)}<select aria-label="Adicionar dia de vencimento" value={day} onChange={e=>setDay(Number(e.target.value))} className="tw:w-20! tw:min-h-8! tw:text-xs!">{Array.from({length:28},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select><button type="button" className="tw:rounded tw:border tw:border-[var(--line)] tw:px-2 tw:py-1 tw:text-xs" onClick={()=>setDays(v=>[...new Set([...v,day])].sort((a,b)=>a-b))}>Adicionar dia</button></div></fieldset>;
}
