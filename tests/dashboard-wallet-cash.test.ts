import test from "node:test";
import assert from "node:assert/strict";
import {dashboardFinancialRows,type DashboardEntry} from "../src/lib/reports/dashboard-data";
test("redeeming existing client credit settles revenue without recording a second cash receipt",()=>{
 const from=new Date("2035-01-01T00:00:00Z"),to=new Date("2035-01-31T23:59:59Z");
 const paidAt=new Date("2035-01-10T15:00:00Z");
 const entry={id:"credit-qa",playerId:"dependent-qa",player:{name:"Dependente QA"},type:"REVENUE",category:"Plano",status:"PAID",amountCents:5000,dueDate:new Date("2035-01-10T12:00:00Z"),paidAt,paymentMethod:"CREDIT_BALANCE",settlements:[{id:"credit",amountCents:5000,paidAt,paymentMethod:"CREDIT_BALANCE"}]} as unknown as DashboardEntry;
 assert.equal(dashboardFinancialRows([entry],"caixa",from,to).length,0);
 assert.equal(dashboardFinancialRows([entry],"competencia",from,to)[0].value,5000);
 entry.settlements=[{id:"credit",amountCents:3000,paidAt,paymentMethod:"CREDIT_BALANCE",interestCents:0,discountCents:0},{id:"cash",amountCents:2000,paidAt,paymentMethod:"PIX",interestCents:0,discountCents:0}];
 assert.deepEqual(dashboardFinancialRows([entry],"caixa",from,to).map(row=>row.value),[2000]);
});
test("reserva paga com crédito do plano não duplica caixa ou faturamento da mensalidade",()=>{
 const from=new Date("2035-01-01T00:00:00Z"),to=new Date("2035-01-31T23:59:59Z"),paidAt=new Date("2035-01-10T15:00:00Z");
 const entry={id:"reservation-credit",type:"REVENUE",category:"Reserva",status:"PAID",amountCents:5000,dueDate:paidAt,paidAt,paymentMethod:"RESERVATION_CREDIT",settlements:[{id:"use",amountCents:5000,paidAt,paymentMethod:"RESERVATION_CREDIT"}]} as unknown as DashboardEntry;
 for(const view of ["caixa","competencia"] as const)assert.equal(dashboardFinancialRows([entry],view,from,to).length,0);
 entry.settlements=[{id:"use",amountCents:3000,paidAt,paymentMethod:"RESERVATION_CREDIT",interestCents:0,discountCents:0},{id:"cash",amountCents:2000,paidAt,paymentMethod:"PIX",interestCents:0,discountCents:0}];
 for(const view of ["caixa","competencia"] as const)assert.deepEqual(dashboardFinancialRows([entry],view,from,to).map(row=>row.value),[2000]);
});
