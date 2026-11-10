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

test("parcelas personalizadas conservam total, validam datas reais e não alteram a programação original", async () => {
 const { customizedCardInstallments, readCardInstallmentRows } = await import("../src/lib/finance/card-installments");
 const custom=[{dueDate:"2027-01-10",amountCents:5000},{dueDate:"2027-02-15",amountCents:2000},{dueDate:"2027-04-05",amountCents:3000}];
 const rows=customizedCardInstallments(10000,3,new Date("2027-01-31T12:00:00Z"),custom);
 assert.deepEqual(rows.map(row=>[row.number,row.dueDate.toISOString().slice(0,10),row.amountCents]),[[1,"2027-01-10",5000],[2,"2027-02-15",2000],[3,"2027-04-05",3000]]);
 assert.equal(custom[0].dueDate,"2027-01-10");
 for(const invalid of [custom.slice(1),[...custom.slice(0,2),{dueDate:"2027-02-31",amountCents:3000}],[...custom.slice(0,2),{dueDate:"2027-03-01",amountCents:2999}],[...custom.slice(0,2),{dueDate:"2027-03-01",amountCents:-1}]]) assert.throws(()=>customizedCardInstallments(10000,3,new Date(),invalid));
 const form=new FormData();form.set("cardInstallmentRows",JSON.stringify(custom));assert.deepEqual(readCardInstallmentRows(form),custom);form.set("cardInstallmentRows","not-json");assert.throws(()=>readCardInstallmentRows(form));
});

test("filtros iniciais usam mês da Arena e abertos, preservando escolhas e links de consulta", async () => {
 const {defaultLedgerFilters}=await import("../src/lib/finance/default-ledger-filters");
 assert.deepEqual(defaultLedgerFilters({},new Date("2026-12-01T01:00:00Z")),{start:"2026-11-01",end:"2026-11-30",status:"OPEN"});
 assert.deepEqual(defaultLedgerFilters({start:"",end:"",status:"ALL"}),{start:"",end:"",status:"ALL"});
 assert.deepEqual(defaultLedgerFilters({start:"2026-01-01",end:"2026-01-31",status:"PAID"}),{start:"2026-01-01",end:"2026-01-31",status:"PAID"});
 assert.deepEqual(defaultLedgerFilters({description:"Aviso específico"}),{description:"Aviso específico"});
});
