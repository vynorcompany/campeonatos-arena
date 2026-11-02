import assert from "node:assert/strict";
import test from "node:test";
import { planWeeklyRuleCopy, copyWeeklyRule } from "../src/lib/scheduling/copy-weekly-rule";
const source = { id: "source", weekday: 1, startsAtMinute: 420, endsAtMinute: 660, priceCents: 5000, available: true };
const destination = { ...source, id: "destination", weekday: 2, startsAtMinute: 360, endsAtMinute: 1320, priceCents: 6000, available: false };
test("copy replaces overlapping hours while preserving destination hours and prices outside them", () => {
  const plan = planWeeklyRuleCopy(source, [source, destination], [2]);
  assert.deepEqual(plan.removeIds, ["destination"]);
  assert.deepEqual(plan.create.map(r => [r.startsAtMinute, r.endsAtMinute, r.priceCents, r.available]), [[360,420,6000,false],[660,1320,6000,false],[420,660,5000,true]]);
});
test("copy all includes occupied days, skips source and never creates overlaps", () => {
  const plan = planWeeklyRuleCopy(source, [source, destination], [0,1,2,3,4,5,6]);
  assert.equal(plan.create.filter(r => r.startsAtMinute === 420).length, 6);
  assert.equal(plan.create.some(r => r.weekday === 1), false);
  for (const a of plan.create) for (const b of plan.create) if(a !== b && a.weekday === b.weekday) assert.ok(a.endsAtMinute <= b.startsAtMinute || b.endsAtMinute <= a.startsAtMinute);
});
test("repeating copy is idempotent and adjacent periods are preserved", () => {
  const adjacent = { ...destination, id:"adjacent", startsAtMinute:660 };
  const existing = { ...source, id:"copy", weekday:2 };
  const plan = planWeeklyRuleCopy(source,[source, existing, adjacent],[2]);
  assert.deepEqual(plan.removeIds,["copy"]);
  assert.equal(plan.create.length,1);
});
test("copy locks arena-owned court and never touches bookings or financial records", async () => {
  const calls: string[]=[];
  const tx:any={ $queryRaw:async()=>{calls.push("lock");return[]}, courtWeeklyRule:{
    findFirst:async({where}:any)=>{assert.equal(where.court.arenaId,"arena");return {courtId:"court"}},
    findMany:async()=>{assert.deepEqual(calls,["lock"]);return [source,destination]},
    deleteMany:async({where}:any)=>{assert.equal(where.court.arenaId,"arena");assert.deepEqual(where.id.in,["destination"]);calls.push("delete")},
    createMany:async({data}:any)=>{assert.equal(data.length,3);assert.ok(data.every((r:any)=>r.courtId==="court"));calls.push("create")}
  }};
  assert.deepEqual(await copyWeeklyRule(tx,"arena","source",2),{success:true});
  assert.deepEqual(calls,["lock","delete","create"]);
  tx.courtWeeklyRule.findFirst=async()=>null;
  assert.deepEqual(await copyWeeklyRule(tx,"other","source",2),{error:"Faixa não encontrada."});
});
