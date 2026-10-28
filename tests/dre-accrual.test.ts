import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { buildDreRows, dreReportWhere, parseDreGroup, drePeriod, dreCashPeriod } from "../src/lib/reports/dre";
import { loadDreReportData } from "../src/lib/reports/financial-report-data";
test("DRE separates net revenue, costs, operations, finance and income taxes", () => {
 const group = (category: string, type: string, amountCents: number) => ({ category, type, _sum: { amountCents } });
 const rows = buildDreRows([group("Vendas","REVENUE",10000),group("Produtos","EXPENSE",2000),group("Aluguel","EXPENSE",1000),group("Juros","EXPENSE",200),group("Imposto","EXPENSE",300),group("Aporte","INCOME",99999),group("CREDITO_DE_CLIENTE","INCOME",99999)], [{name:"Produtos",dreGroup:"COSTS"},{name:"Juros",dreGroup:"FINANCIAL"},{name:"Imposto",dreGroup:"TAXES"},{name:"Aporte",dreGroup:"EXCLUDE"}], { revenue: 500, expense: 100 });
 assert.equal(rows.find(row => row.label === "Receita líquida")?.amount,9500);
 assert.equal(rows.find(row => row.label === "Lucro bruto")?.amount,7500);
 assert.equal(rows.at(-1)?.amount,6100);
 assert.throws(() => parseDreGroup("INVALID"));
});
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled=(()=>{try{const u=new URL(url);return u.hostname==="127.0.0.1"&&u.port==="55433"&&u.pathname==="/arena_goal";}catch{return false;}})();
test("DRE uses competence regardless of payment, falls back to due date and excludes voided or foreign records",{skip:!enabled},async()=>{
 const db=new PrismaClient({datasources:{db:{url}}});const rollback=new Error("rollback");
 try{await assert.rejects(db.$transaction(async tx=>{
 const a=await tx.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}}),b=await tx.arena.findUniqueOrThrow({where:{slug:"arena-beta-goal"}});
 const at=new Date("2048-03-10T12:00:00Z"),outside=new Date("2048-04-10T12:00:00Z");
 await tx.financialEntry.createMany({data:[
 {arenaId:a.id,type:"REVENUE",category:"QA",description:"Accrued but unpaid",amountCents:1000,competenceDate:at,dueDate:outside,createdAt:outside},
 {arenaId:a.id,type:"REVENUE",category:"QA",description:"Paid now, accrued outside",amountCents:2000,competenceDate:outside,dueDate:at,paidAt:at,status:"PAID",createdAt:at},
 {arenaId:a.id,type:"EXPENSE",category:"QA",description:"Legacy due date",amountCents:300,dueDate:at,createdAt:outside},
 {arenaId:a.id,type:"REVENUE",category:"QA",description:"Voided",amountCents:9999,competenceDate:at,status:"VOIDED"},
 {arenaId:b.id,type:"REVENUE",category:"QA",description:"Foreign",amountCents:9999,competenceDate:at}
 ]});
 const report=await loadDreReportData(tx as unknown as Parameters<typeof loadDreReportData>[0],dreReportWhere(a.id,{gte:new Date("2048-03-01"),lte:new Date("2048-03-31T23:59:59Z")}));
 assert.equal(report.entries.length,2);assert.equal(report.byType.reduce((sum,row)=>sum+(row._sum.amountCents??0),0),1300);throw rollback;
 }),error=>error===rollback);}finally{await db.$disconnect()}
});

test("DRE keeps civil dates separate from Brazilian cash timestamps", () => {
 const period = drePeriod(undefined, undefined, new Date("2026-10-29T01:00:00Z"));
 assert.equal(period.gte.toISOString(), "2026-10-01T00:00:00.000Z");
 assert.equal(period.lte.toISOString(), "2026-10-28T23:59:59.999Z");
 const cash = dreCashPeriod(period);
 assert.equal(cash.gte.toISOString(), "2026-10-01T03:00:00.000Z");
 assert.equal(cash.lte.toISOString(), "2026-10-29T02:59:59.999Z");
});

test("DRE reverses costs and revenues with credit and debit corrections", () => {
 const groups = [
  { type: "REVENUE", category: "Vendas", _sum: { amountCents: 10000 } },
  { type: "EXPENSE", category: "Vendas", _sum: { amountCents: 1000 } },
  { type: "EXPENSE", category: "Mercadorias", _sum: { amountCents: 3000 } },
  { type: "INCOME", category: "Mercadorias", _sum: { amountCents: 500 } },
 ];
 const rows = buildDreRows(groups, [{ name: "Vendas", dreGroup: "REVENUE" }, { name: "Mercadorias", dreGroup: "COSTS" }]);
 assert.equal(rows[0].amount, 9000);
 assert.equal(rows.find(row => row.label === "(−) Custos dos produtos e serviços")?.amount, -2500);
 assert.equal(rows.at(-1)?.amount, 6500);
});
