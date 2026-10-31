import assert from "node:assert/strict";
import test from "node:test";
import { dashboardFinancialRows, type DashboardEntry } from "../src/lib/reports/dashboard-data";

const from = new Date("2026-10-01T00:00:00Z"), to = new Date("2026-10-31T23:59:59.999Z");
function entry(values: Partial<DashboardEntry>): DashboardEntry {
 return {id:"receipt",type:"REVENUE",category:"COMANDAS",status:"PAID",amountCents:1000,dueDate:new Date("2026-10-15T12:00:00Z"),paidAt:new Date("2026-10-15T15:00:00Z"),description:"Comanda",counterpartyName:"Cliente QA",paymentMethod:"PIX",recurrenceId:null,playerId:null,player:null,sale:null,scheduleParticipant:null,settlements:[],...values};
}

test("dashboard counts canonical and historical comanda receipts once and excludes credit deposits", () => {
 const entries=[entry({id:"new"}),entry({id:"legacy",type:"INCOME",amountCents:2000,dueDate:null}),entry({id:"credit",type:"INCOME",category:"CREDITO_DE_CLIENTE",amountCents:4000}),entry({id:"voided",status:"VOIDED",amountCents:5000}),entry({id:"settled",type:"INCOME",amountCents:1000,settlements:[{id:"s1",amountCents:250,interestCents:0,discountCents:0,paidAt:new Date("2026-10-15T15:00:00Z"),paymentMethod:"PIX"},{id:"s2",amountCents:750,interestCents:0,discountCents:0,paidAt:new Date("2026-11-15T15:00:00Z"),paymentMethod:"PIX"}]})];
 const rows=dashboardFinancialRows(entries,"caixa",from,to).filter(row=>row.type==="REVENUE");
 assert.equal(rows.reduce((sum,row)=>sum+row.value,0),3250);
 assert.equal(rows.filter(row=>row.id==="legacy").length,1);
 assert.equal(rows.some(row=>row.id==="credit"||row.id==="voided"),false);
 assert.equal(dashboardFinancialRows([entries[1]],"competencia",from,to)[0].value,2000);
 assert.equal(dashboardFinancialRows([entries[1]],"caixa",new Date("2026-09-01T00:00:00Z"),new Date("2026-09-30T23:59:59Z")).length,0);
});
