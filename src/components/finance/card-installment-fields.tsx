"use client";
import { InstallmentEditor, useInstallmentDraft } from "./installment-editor";
import { useEffect, useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function CardInstallmentFields({amountCents,onAmountChange,firstDueDate,fixedTotal=false,onModeChange}:{amountCents:number;onAmountChange:(value:number)=>void;firstDueDate:string;fixedTotal?:boolean;onModeChange?:(mode:string)=>void}) {
 const [count,setCount]=useState(3),[mode,setMode]=useState("TOTAL"),[unit,setUnit]=useState(0),[requestId,setRequestId]=useState("");
 useEffect(()=>setRequestId(crypto.randomUUID()),[]);
 const draft = useInstallmentDraft(amountCents,count,firstDueDate);
 const changeCount=(value:number)=>{setCount(value);if(mode==="UNIT"&&Number.isSafeInteger(value))onAmountChange(unit*value);};
 const rows = draft.rows;
 const money=(cents:number)=>(cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 return <div className="tw:col-span-full tw:grid tw:min-w-0 tw:gap-3 tw:rounded-lg tw:border tw:border-[#a8bfda] tw:p-3">
 <input type="hidden" name="cardInstallmentCount" value={count}/><input type="hidden" name="installmentRequestId" value={requestId}/><input type="hidden" name="paymentMethod" value="Cartão de crédito"/>
 <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-3"><label className={`${ui.field} tw:w-28`}>Parcelas<input aria-label="Número de parcelas" type="number" min="2" max="36" required value={count||""} onChange={e=>changeCount(Number(e.target.value))}/></label>{!fixedTotal?<label className={`${ui.field} tw:w-48`}>Informar valor<select value={mode} onChange={e=>{setMode(e.target.value);onModeChange?.(e.target.value);if(e.target.value==="UNIT"){const next=Math.round(amountCents/Math.max(2,count));setUnit(next);onAmountChange(next*count);}}}><option value="TOTAL">Valor total</option><option value="UNIT">Valor de cada parcela</option></select></label>:null}{mode==="UNIT"&&!fixedTotal?<label className={`${ui.field} tw:w-44`}>Valor de cada parcela<CurrencyInput aria-label="Valor de cada parcela" valueCents={unit} onValueCentsChange={value=>{setUnit(value);onAmountChange(value*count);}} required/></label>:null}</div>
 <p className="tw:m-0 tw:text-sm">Total <strong className="tw:tabular-nums">{money(amountCents)}</strong>{rows.length ? rows.every(row=>row.amountCents===rows[0].amountCents) ? <> · {count}× de {money(rows[0].amountCents)}</> : <> · {count} parcelas com valores ajustáveis</> : null}</p>{rows.length&&firstDueDate?<InstallmentEditor totalCents={amountCents} rows={draft.rows} onChange={rows=>{draft.setRows(rows);if(mode!=="TOTAL"){setMode("TOTAL");onModeChange?.("TOTAL");}}} name="cardInstallmentRows"/>:null}<small className="tw:text-xs tw:text-[#42536a]">Os lançamentos ficam em aberto até a baixa.</small>
 </div>;
}
