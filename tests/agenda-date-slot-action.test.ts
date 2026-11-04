import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import { availabilityDate, readDateAvailability } from "../src/lib/calendar/date-availability";
function fixture() {
 const writes:any[]=[],scopes:string[]=[],permissions:string[]=[];let conflict=false;
 const tx={ $queryRaw:async()=>[], court:{findFirst:async()=>({id:"court-a",dateAvailability:[]}),update:async(args:any)=>writes.push(args)},arena:{findUniqueOrThrow:async()=>({scheduleStartMinute:420,scheduleEndMinute:1320,scheduleSlotMinutes:30})},scheduleOccurrence:{findFirst:async()=>conflict?{id:"occupied"}:null}};
 const mocks:any={zod:{z},"@/lib/calendar/date-availability":{availabilityDate,readDateAvailability},"@/lib/calendar/online-booking-hold":{activeCourtOccurrenceWhere:()=>({status:"SCHEDULED"})},"@/lib/auth/guards":{requirePermission:async(p:string)=>{permissions.push(p);return{arenaId:"arena-a"};}},"@/lib/rls":{withArenaTransaction:async(id:string,fn:any)=>{scopes.push(id);return fn(tx);}},"@/lib/calendar/booking-services":{BookingServiceUnavailableError:class extends Error{}},"@/lib/calendar/revalidation":{refreshCalendarRoutes:()=>{}},"@/lib/finance/revalidation":{},"@/lib/calendar/staff-operations":{}};
 const exports:any={};vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/actions/agenda-operations.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(key:string)=>mocks[key],Date,FormData});
 const submit=(changes:Record<string,string>={})=>{const form=new FormData();for(const [key,value] of Object.entries({courtId:"court-a",date:"2040-01-02",startsAtMinute:"600",endsAtMinute:"630",priceCents:"4000",online:"false",...changes}))form.set(key,value);return exports.openAgendaDateSlotAction(form);};
 return{writes,scopes,permissions,submit,setConflict:()=>{conflict=true;}};
}
test("opening a slot uses the authenticated arena, exact date and explicit online choice",async()=>{
 const f=fixture();assert.deepEqual(JSON.parse(JSON.stringify(await f.submit({arenaId:"other-arena"}))),{});
 assert.deepEqual(f.scopes,["arena-a"]);assert.deepEqual(f.permissions,["calendar:recurrence:release"]);
 assert.equal(f.writes[0].where.arenaId,"arena-a");assert.equal(f.writes[0].data.dateAvailability[0].date,"2040-01-02");assert.equal(f.writes[0].data.dateAvailability[0].online,false);
});
test("occupied, off-grid and invalid calendar dates cannot be opened",async()=>{
 const invalidCases: Record<string,string>[]=[{date:"2040-02-31"},{startsAtMinute:"601"},{endsAtMinute:"660"}];
 for(const changes of invalidCases){const f=fixture();assert.ok((await f.submit(changes)).error);assert.equal(f.writes.length,0);}
 const f=fixture();f.setConflict();assert.ok((await f.submit()).error);assert.equal(f.writes.length,0);
});
