import test from "node:test";
import assert from "node:assert/strict";
import { courtRulesForDate, readDateAvailability } from "../src/lib/calendar/date-availability";
import { calculateCourtIntervalPrice } from "../src/lib/calendar/court-interval-pricing";
const date=new Date(2026,10,4), weekday=date.getDay();
const rules=[{weekday,startsAtMinute:420,endsAtMinute:1320,priceCents:6000,available:false}];
const opening={date:"2026-11-04",startsAtMinute:600,endsAtMinute:630,priceCents:4000,online:false};
test("dated opening applies only to its date and interval without mutating weekly rules",()=>{
 const result=courtRulesForDate(rules,[opening],date);
 const price=(minute:number)=>calculateCourtIntervalPrice({startsAtMinute:minute,durationMinutes:30,intervalMinutes:30,weekday,rules:result});
 assert.equal(price(600),4000);assert.equal(price(570),null);assert.equal(price(630),null);
 assert.deepEqual(rules,[{weekday,startsAtMinute:420,endsAtMinute:1320,priceCents:6000,available:false}]);
 assert.deepEqual(courtRulesForDate(rules,[opening],new Date(2026,10,11)),rules);
});
test("staff-only openings never grant online availability; opted-in openings keep the agreed price",()=>{
 assert.deepEqual(courtRulesForDate(rules,[opening],date,true),rules);
 const online=courtRulesForDate(rules,[{...opening,online:true}],date,true);
 assert.equal(calculateCourtIntervalPrice({startsAtMinute:600,durationMinutes:30,intervalMinutes:30,weekday,rules:online}),4000);
 assert.equal(calculateCourtIntervalPrice({startsAtMinute:600,durationMinutes:60,intervalMinutes:30,weekday,rules:online}),null);
});
test("invalid stored settings fail closed",()=>{
 assert.deepEqual(readDateAvailability({}),[]); assert.deepEqual(readDateAvailability([{...opening,priceCents:-1}]),[]);
});
