import assert from "node:assert/strict";
import test from "node:test";
import { paidLessonCreditCycle } from "../src/lib/academy/paid-lesson-credit-cycle";
const subscription = { id: "subscription-a", planId: "plan-a", startedAt: new Date("2026-10-01T12:00:00Z"), createdAt: new Date("2026-10-01T15:00:00Z") };
const payment = { planId: "plan-a", dueDate: new Date("2026-11-10T12:00:00Z"), createdAt: new Date("2026-10-01T15:00:01Z"), paidAt: new Date("2026-10-31T21:00:00Z"), status: "PAID" };
test("lesson allowances require a paid bill belonging to the active subscription and month", () => {
 const now=new Date("2026-11-02T15:00:00Z");
 assert.equal(paidLessonCreditCycle(subscription,payment,now)?.sourceKey,"MONTH:subscription-a:2026-11");
 for(const status of ["PENDING","PARTIAL","OVERDUE","VOIDED"])assert.equal(paidLessonCreditCycle(subscription,{...payment,status},now),null);
 assert.equal(paidLessonCreditCycle(subscription,{...payment,planId:"other-plan"},now),null);
 assert.equal(paidLessonCreditCycle(subscription,{...payment,dueDate:null},now),null);
 assert.equal(paidLessonCreditCycle(subscription,{...payment,createdAt:new Date("2026-09-01T12:00:00Z")},now),null);
 assert.equal(paidLessonCreditCycle(subscription,{...payment,dueDate:new Date("2026-12-10T12:00:00Z")},now),null);
 assert.equal(paidLessonCreditCycle(subscription,{...payment,dueDate:new Date("2026-09-10T12:00:00Z")},now),null);
});
test("prepaying a future month does not grant its credits before the arena month starts",()=>{
 assert.equal(paidLessonCreditCycle(subscription,payment,new Date("2026-11-01T01:00:00Z")),null);
 assert.equal(paidLessonCreditCycle(subscription,payment,new Date("2026-11-01T03:00:00Z"))?.sourceKey,"MONTH:subscription-a:2026-11");
 assert.equal(paidLessonCreditCycle(subscription,{...payment,paidAt:new Date("2026-11-02T14:59:00Z")},new Date("2026-11-02T15:00:00Z"))?.sourceKey,"MONTH:subscription-a:2026-11");
});
