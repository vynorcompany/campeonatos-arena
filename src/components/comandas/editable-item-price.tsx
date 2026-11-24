"use client";
import { useEffect, useState } from "react";
import { CentavosInput } from "@/components/forms/centavos-input";
export function EditableItemPrice({ cents, label, disabled, onSave }: { cents:number;label:string;disabled:boolean;onSave:(cents:number)=>void }) {
 const format=(amount:number)=>new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(amount/100);
 const [value,setValue]=useState(format(cents));
 useEffect(()=>setValue(format(cents)),[cents]);
 return <CentavosInput value={value} onValueChange={setValue} aria-label={label} disabled={disabled} onBlur={()=>{const next=Math.round(Number(value.replace(/\./g,"").replace(",","."))*100)||0;if(next!==cents)onSave(next);}}/>;
}
