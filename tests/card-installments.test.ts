import assert from "node:assert/strict";
import test from "node:test";
import {cardInstallmentSchedule,readCardInstallmentCount} from "../src/lib/finance/card-installments";
import {rememberedFilterQuery} from "../src/lib/navigation/filter-memory";
test("parcelas conservam centavos, respeitam mês curto e não alteram a data original",()=>{
 const start=new Date("2028-01-31T12:00:00Z"),rows=cardInstallmentSchedule(10000,3,start);
 assert.deepEqual(rows.map(r=>r.amountCents),[3334,3333,3333]);assert.equal(rows.reduce((n,r)=>n+r.amountCents,0),10000);
 assert.deepEqual(rows.map(r=>r.dueDate.toISOString().slice(0,10)),["2028-01-31","2028-02-29","2028-03-31"]);assert.equal(start.toISOString(),"2028-01-31T12:00:00.000Z");
 for(const [total,count] of [[1,3],[100,0],[100,37],[100,2.5],[Infinity,2],[-10,2]])assert.throws(()=>cardInstallmentSchedule(total,count,start));
 const form=new FormData();assert.equal(readCardInstallmentCount(form),null);form.set("cardInstallmentCount","3");assert.equal(readCardInstallmentCount(form),3);form.set("cardInstallmentCount","3.5");assert.throws(()=>readCardInstallmentCount(form));
});
test("memória guarda filtros e exclui tokens, ações e parâmetros não autorizados",()=>{
 assert.equal(rememberedFilterQuery("status=PAID&start=2026-11-01&token=secret&entryId=123&name=Ana"),"status=PAID&start=2026-11-01&name=Ana");
 assert.equal(rememberedFilterQuery("status=&name=&dateField=paidAt"),"status=&name=&dateField=paidAt");
 assert.equal(rememberedFilterQuery("q="+"x".repeat(301)),"");
 assert.equal(rememberedFilterQuery("visao=competencia&comparar=previous-month&periodo=week&tipo=aula&stock=low"),"visao=competencia&comparar=previous-month&periodo=week&tipo=aula&stock=low");
});
