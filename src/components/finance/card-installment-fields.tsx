"use client";
import { InstallmentEditor, useInstallmentDraft } from "./installment-editor";
import { useEffect, useState } from "react";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function CardInstallmentFields({amountCents,firstDueDate}:{amountCents:number;firstDueDate:string;onAmountChange?:(value:number)=>void;fixedTotal?:boolean;onModeChange?:(mode:string)=>void}) {
 const [count,setCount]=useState(3),[requestId,setRequestId]=useState("");
 useEffect(()=>setRequestId(crypto.randomUUID()),[]);
 const draft = useInstallmentDraft(amountCents,count,firstDueDate);
 return <div className="tw:col-span-full tw:grid tw:min-w-0 tw:gap-4 tw:rounded-md tw:border tw:border-[#a8bfda] tw:p-3 tw:min-[900px]:grid-cols-[180px_minmax(0,1fr)]">
 <input type="hidden" name="cardInstallmentCount" value={count}/><input type="hidden" name="installmentRequestId" value={requestId}/><input type="hidden" name="paymentMethod" value="Cartão de crédito"/>
 <div className="tw:grid tw:content-start tw:gap-3"><label className={ui.field}>Parcelas<input aria-label="Número de parcelas" type="number" min="2" max="36" required value={count||""} onChange={e=>setCount(Number(e.target.value))}/></label><p className="tw:m-0 tw:text-sm">Total <strong className="tw:tabular-nums">{(amountCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong></p><small className="tw:text-xs tw:text-[#42536a]">Edite o valor e a data de cada parcela ao lado.</small></div>
 <InstallmentEditor totalCents={amountCents} rows={draft.rows} onChange={draft.setRows} name="cardInstallmentRows"/>
 <small className="tw:col-span-full tw:text-xs tw:text-[#42536a]">Os lançamentos ficam em aberto até a baixa.</small>
 </div>;
}
