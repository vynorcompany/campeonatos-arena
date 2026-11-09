"use client";
import { useEffect, useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";
import { cardInstallmentSchedule } from "@/lib/finance/card-installments";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function CardInstallmentFields({amountCents,onAmountChange,firstDueDate,fixedTotal=false,onModeChange}:{amountCents:number;onAmountChange:(value:number)=>void;firstDueDate:string;fixedTotal?:boolean;onModeChange?:(mode:string)=>void}) {
 const [count,setCount]=useState(3),[mode,setMode]=useState("TOTAL"),[unit,setUnit]=useState(0),[requestId,setRequestId]=useState("");
 useEffect(()=>setRequestId(crypto.randomUUID()),[]);
 const changeCount=(value:number)=>{setCount(value);if(mode==="UNIT"&&Number.isSafeInteger(value))onAmountChange(unit*value);};
 let rows:{amountCents:number;dueDate:Date;number:number}[]=[];try{rows=cardInstallmentSchedule(amountCents,count,new Date(`${firstDueDate||new Date().toISOString().slice(0,10)}T12:00:00Z`));}catch{}
 const money=(cents:number)=>(cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 return <div className="tw:col-span-full tw:grid tw:min-w-0 tw:gap-3 tw:rounded-lg tw:border tw:border-[#a8bfda] tw:p-3">
 <input type="hidden" name="cardInstallmentCount" value={count}/><input type="hidden" name="installmentRequestId" value={requestId}/><input type="hidden" name="paymentMethod" value="Cartão de crédito"/>
 <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-3"><label className={`${ui.field} tw:w-28`}>Parcelas<input aria-label="Número de parcelas" type="number" min="2" max="36" required value={count||""} onChange={e=>changeCount(Number(e.target.value))}/></label>{!fixedTotal?<label className={`${ui.field} tw:w-48`}>Informar valor<select value={mode} onChange={e=>{setMode(e.target.value);onModeChange?.(e.target.value);if(e.target.value==="UNIT"){const next=Math.round(amountCents/Math.max(2,count));setUnit(next);onAmountChange(next*count);}}}><option value="TOTAL">Valor total</option><option value="UNIT">Valor de cada parcela</option></select></label>:null}{mode==="UNIT"&&!fixedTotal?<label className={`${ui.field} tw:w-44`}>Valor de cada parcela<CurrencyInput aria-label="Valor de cada parcela" valueCents={unit} onValueCentsChange={value=>{setUnit(value);onAmountChange(value*count);}} required/></label>:null}</div>
 <p className="tw:m-0 tw:text-sm">Total <strong className="tw:tabular-nums">{money(amountCents)}</strong>{rows.length?<> · {count}× de <strong>{money(rows[0].amountCents)}</strong>{rows.some(r=>r.amountCents!==rows[0].amountCents)?<small className="tw:ml-1 tw:text-xs">(ajuste de centavos nas últimas parcelas)</small>:null}</>:null}</p>{rows.length&&firstDueDate?<details className="tw:text-xs"><summary className="tw:w-fit tw:cursor-pointer tw:text-[#174983]">Ver parcelas e vencimentos</summary><ol className="tw:m-0 tw:mt-2 tw:grid tw:max-h-40 tw:gap-2 tw:overflow-y-auto tw:pl-5">{rows.map(row=><li key={row.number}>{row.number}/{count} · {row.dueDate.toLocaleDateString("pt-BR",{timeZone:"UTC"})} · {money(row.amountCents)}</li>)}</ol></details>:null}<small className="tw:text-xs tw:text-[#42536a]">Vencimentos mensais a partir da data da primeira parcela. Os lançamentos ficam em aberto até a baixa.</small>
 </div>;
}
