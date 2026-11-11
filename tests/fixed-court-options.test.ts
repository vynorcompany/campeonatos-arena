import test from "node:test";
import assert from "node:assert/strict";
import { availableFixedTimes, fixedMonthAmount, planDueDays } from "../src/lib/plans/fixed-court";
test("fixed reservations follow configured court hours and never bridge a closed gap",()=>{
 const rules=[{weekday:1,startsAtMinute:420,endsAtMinute:480,available:true},{weekday:1,startsAtMinute:480,endsAtMinute:540,available:true},{weekday:1,startsAtMinute:600,endsAtMinute:660,available:false}];
 assert.deepEqual(availableFixedTimes(rules,1,90),[420,450]);
 assert.deepEqual(availableFixedTimes(rules,2,90),[]);
 assert.deepEqual(availableFixedTimes(rules,1,150),[]);
});
test("fifth occurrence is optional; cents round once and month length/leap year are respected",()=>{
 assert.deepEqual(fixedMonthAmount(40000,2035,0,1,true),{amountCents:50000,occurrences:5});
 assert.equal(fixedMonthAmount(40000,2035,0,1,false).amountCents,40000);
 assert.equal(fixedMonthAmount(40000,2035,1,1,true).amountCents,40000);
 assert.equal(fixedMonthAmount(101,2035,0,1,true).amountCents,126);
 assert.equal(fixedMonthAmount(40000,2032,1,0,true).occurrences,5);
});
test("custom due date choices normalize duplicates and reject invalid choices",()=>{
 assert.deepEqual(planDueDays(["15","5","15"]),[5,15]);assert.deepEqual(planDueDays([],10),[10]);
 for(const invalid of [[0],[29],["abc"],[1.5]]) assert.throws(()=>planDueDays(invalid));
});
test("two weekly days produce one monthly amount and configurable credits",async()=>{
 const {fixedCycle,fixedSchedules}=await import("../src/lib/plans/fixed-court");
 assert.deepEqual(fixedSchedules('[{"weekday":1,"startMinute":600},{"weekday":3,"startMinute":660}]',{weekday:0,startMinute:0}),[{weekday:1,startMinute:600},{weekday:3,startMinute:660}]);
 assert.throws(()=>fixedSchedules('[{"weekday":1,"startMinute":600},{"weekday":1,"startMinute":660}]',{weekday:0,startMinute:0}),/dias diferentes/);
 assert.deepEqual(fixedCycle(40000,8,2035,0,[1,3],true),{amountCents:50000,credits:10,occurrences:10});
 assert.deepEqual(fixedCycle(40000,8,2035,0,[1,3],false),{amountCents:40000,credits:8,occurrences:10});
});
