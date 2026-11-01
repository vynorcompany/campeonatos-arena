import assert from "node:assert/strict";
import test from "node:test";
import { dashboardProjectedCost, type ProjectionEntry, type ProjectionRecurrence } from "../src/lib/reports/dashboard-projections";
import { cashChartScale } from "../src/lib/reports/cash-chart-scale";
import { bookingPreviewName } from "../src/lib/calendar/booking-preview-name";
const date = (day: number, month = 10) => new Date(2026, month, day, 12);
const recurrence: ProjectionRecurrence = { id: "rent", type: "EXPENSE", active: true, amountCents: 10000, startsAt: date(5), endsAt: null, nextDueDate: date(5), frequency: "MONTHLY", description: "Aluguel", counterpartyName: "Locador", playerId: null };
const entry: ProjectionEntry = { id: "rent-paid", type: "EXPENSE", status: "PAID", amountCents: 10000, dueDate: date(5), recurrenceId: "rent", settlements: [{amountCents: 10000}], description: "Aluguel", counterpartyName: "Locador", playerId: null };
test("projected payables include paid and pending costs, suppress duplicate and voided recurrence dates, and follow the selected period", () => {
 const entries = [entry, {...entry,id:"pending", status:"OPEN", recurrenceId:null,amountCents:2500,settlements:[]}, {...entry,id:"income",type:"REVENUE",recurrenceId:null,amountCents:99999}];
 assert.equal(dashboardProjectedCost(entries,[recurrence],date(1),date(30)),12500);
 assert.equal(dashboardProjectedCost(entries,[recurrence],date(1,11),date(31,11)),10000);
 assert.equal(dashboardProjectedCost([{...entry,status:"VOIDED"}],[recurrence],date(1),date(30)),0);
 assert.equal(dashboardProjectedCost([],[],date(1),date(30)),0);
});
test("cash flow scale keeps negative results visible and includes automatic cost references", () => {
 const scale = cashChartScale([{income:10000,expense:15000}],20000);
 assert.equal(scale.min,-5000); assert.equal(scale.max,20000);
 assert.equal(scale.position(-5000),1); assert.equal(scale.position(20000),0);
 assert.ok(scale.position(0)>0 && scale.position(0)<1);
 assert.ok(Number.isFinite(cashChartScale([]).position(0)));
});
test("booking preview uses one surname and preserves short names",()=>{
 assert.equal(bookingPreviewName("Marina Oliveira Duarte Albuquerque"),"Marina Oliveira");
 assert.equal(bookingPreviewName("Lia dos Campos Pereira"),"Lia Campos");
 assert.equal(bookingPreviewName("Nina Lima"),"Nina Lima");
 assert.equal(bookingPreviewName("Alex"),"Alex");
});
