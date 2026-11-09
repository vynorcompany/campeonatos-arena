import { getFinancialRecurrenceDateAt } from "./recurrences";
export function cardInstallmentSchedule(totalCents:number,count:number,firstDueDate:Date) {
 if(!Number.isSafeInteger(count)||count<2||count>36)throw new Error("Informe entre 2 e 36 parcelas.");
 if(!Number.isSafeInteger(totalCents)||totalCents<count||totalCents>2_000_000_000)throw new Error("Informe um valor válido para o parcelamento.");
 if(!Number.isFinite(firstDueDate.getTime()))throw new Error("Informe o vencimento da primeira parcela.");
 const base=Math.floor(totalCents/count),remainder=totalCents%count;
 return Array.from({length:count},(_,i)=>({number:i+1,amountCents:base+(i<remainder?1:0),dueDate:getFinancialRecurrenceDateAt(firstDueDate,"MONTHLY",i)}));
}
export function readCardInstallmentCount(form:FormData) {
 const value=String(form.get("cardInstallmentCount")??"");if(!value)return null;
 const count=Number(value);if(!Number.isSafeInteger(count)||count<2||count>36)throw new Error("Informe entre 2 e 36 parcelas.");return count;
}
