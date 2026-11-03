import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import ts from "typescript";
import {getDiscountedAmountCents} from "../src/lib/finance/discounts";
import {getNextFinancialRecurrenceDate} from "../src/lib/finance/recurrences";
const require=createRequire(import.meta.url);
function setup(method:string,linked=true){
 const entries:any[]=[],issued:string[]=[],updates:any[]=[],recurrences:any[]=[];
 const db={sponsorshipPlan:{findFirst:async()=>({id:"plan-a",name:"Plano QA",kind:"SPONSORSHIP",sponsorshipType:"Mensal",reservationCredits:0,lessonCredits:0})},player:{findFirst:async()=>({id:"client-a",name:"Cliente QA"})},tvSponsor:{findFirst:async()=>null}};
 const tx={tvSponsor:{create:async()=>({id:"sponsor-a"})},financialRecurrence:{create:async(q:any)=>{recurrences.push(q.data);return{id:"recurrence-a"};},update:async(q:any)=>{updates.push(q.data);}},financialEntry:{create:async(q:any)=>{entries.push(q.data);return{id:`entry-${entries.length}`};}}};
 const exports:any={};const mocks:any={
 "@/lib/payments/recurring-online-charges":{issueRecurringOnlineChargeForEntry:async(arena:string,id:string)=>{assert.equal(arena,"arena-a");issued.push(id);}},
 "@/lib/finance/receiving-bank-account":{requireReceivingBankAccount:async(_tx:any,arena:string,id:string)=>{assert.equal(arena,"arena-a");assert.equal(id,"bank-a");return id;}},
 "@/lib/auth/guards":{requireModuleEdit:async()=>({arenaId:"arena-a"})},"@/lib/arena-database":{arenaDatabase:(arena:string)=>{assert.equal(arena,"arena-a");return db;}},
 "@/lib/rls":{withArenaTransaction:async(arena:string,fn:any)=>{assert.equal(arena,"arena-a");return fn(tx);}},
 "@/lib/uploads":{toPersistentPlayerPhoto:async()=>null,savePublicImageUpload:async()=>null},
 "@/lib/finance/discounts":{getDiscountedAmountCents},"@/lib/finance/recurrences":{getNextFinancialRecurrenceDate},"next/cache":{revalidatePath(){}},
 };
 vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/actions/upcoming-match.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,FormData,Error,require:(name:string)=>mocks[name]??(name.startsWith("@/")?{}:require(name))});
 const form=new FormData();for(const [key,value] of Object.entries({sponsorshipPlanId:"plan-a",name:"Empresa QA",clientId:linked?"client-a":"",startedAt:"2035-01-01",installments:"3",dueDay:"10",monthlyAmount:"100,00",discount:"0",paymentMethod:method,bankAccountId:"bank-a"}))form.set(key,value);
 return{run:()=>exports.insertSponsorInPlanAction(form),entries,issued,updates,recurrences};
}
test("patrocínio em boleto agenda somente as parcelas escolhidas, com conta e vencimentos",async()=>{
 const s=setup("Boleto");await s.run();assert.equal(s.entries.length,3);assert(s.entries.every(e=>e.automaticBoleto&&e.bankAccountId==="bank-a"&&e.paymentMethod==="Boleto"));
 assert.deepEqual(s.entries.map(e=>e.dueDate.toISOString().slice(0,10)),["2035-01-10","2035-02-10","2035-03-10"]);assert.equal(s.updates[0].endsAt.toISOString().slice(0,10),"2035-03-10");assert(s.updates[0].nextDueDate>s.updates[0].endsAt);assert.equal(s.recurrences[0].onlinePaymentMethod,"BOLETO");assert.deepEqual(s.issued,["entry-1"]);
});
test("patrocínio em PIX não cria fila nem chama o emissor de boletos",async()=>{
 const s=setup("PIX");await s.run();assert.equal(s.entries.length,3);assert(s.entries.every(e=>!e.automaticBoleto&&e.paymentMethod==="PIX"));assert.equal(s.recurrences[0].onlinePaymentMethod,"");assert.deepEqual(s.issued,[]);
});
test("boleto de patrocínio exige cliente vinculado antes de gravar a cobrança",async()=>{
 const s=setup("Boleto",false);await assert.rejects(s.run(),/Vincule um cliente/);assert.equal(s.entries.length,0);assert.deepEqual(s.issued,[]);
});
