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

export type CardInstallmentOverride = { dueDate: string; amountCents: number };
export function customizedCardInstallments(totalCents: number, count: number, firstDueDate: Date, custom?: unknown) {
 const standard = cardInstallmentSchedule(totalCents, count, firstDueDate);
 if (custom === undefined || custom === null) return standard;
 if (!Array.isArray(custom) || custom.length !== count) throw new Error("Revise a quantidade de parcelas personalizadas.");
 const rows = custom.map((item: unknown, index: number) => {
  if (!item || typeof item !== "object" || !("dueDate" in item) || !("amountCents" in item)) throw new Error(`Revise a parcela ${index + 1}.`);
  const { dueDate, amountCents } = item;
  if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error(`Informe a data da parcela ${index + 1}.`);
  const date = new Date(`${dueDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dueDate) throw new Error(`Data inválida na parcela ${index + 1}.`);
  if (typeof amountCents !== "number" || !Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 2_000_000_000) throw new Error(`Informe um valor válido na parcela ${index + 1}.`);
  return { number: index + 1, dueDate: date, amountCents };
 });
 if (rows.reduce((sum, row) => sum + row.amountCents, 0) !== totalCents) throw new Error("A soma das parcelas deve ser igual ao valor total. Ajuste os valores antes de salvar.");
 return rows;
}

export function readCardInstallmentRows(form: FormData): unknown {
 const value = form.get("cardInstallmentRows");
 if (!value) return undefined;
 if (typeof value !== "string" || value.length > 10000) throw new Error("Parcelamento personalizado inválido.");
 try { return JSON.parse(value); } catch { throw new Error("Parcelamento personalizado inválido."); }
}
