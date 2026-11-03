import assert from "node:assert/strict";
import test from "node:test";
import { currentPlanBill } from "../src/lib/academy/current-plan-bill";
test("active students display this month's payment before future installments",()=>{
 const today=new Date("2026-11-02T12:00:00Z");
 const paid={id:"november",dueDate:new Date("2026-11-02T12:00:00Z"),status:"PAID"};
 const future={id:"december",dueDate:new Date("2026-12-02T12:00:00Z"),status:"PENDING"};
 const past={id:"october",dueDate:new Date("2026-10-02T12:00:00Z"),status:"PENDING"};
 const source=[future,paid,past];
 assert.equal(currentPlanBill(source,today)?.id,"november");
 assert.deepEqual(source,[future,paid,past]);
 assert.equal(currentPlanBill([future,past],today)?.id,"october");
 assert.equal(currentPlanBill([future],today)?.id,"december");
 assert.equal(currentPlanBill([],today),undefined);
 assert.equal(currentPlanBill([{...paid,status:"VOIDED"},future],today)?.id,"december");
 assert.equal(currentPlanBill([{...paid,status:"VOIDED"}],today)?.id,"november");
});
