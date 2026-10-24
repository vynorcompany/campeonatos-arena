import assert from "node:assert/strict";
import test from "node:test";
import { portalMenu } from "../src/lib/portal/menu";
const visibility = { athletePortalShowBooking: true, athletePortalShowReservations: true, athletePortalShowLessons: true, athletePortalShowClasses: true, athletePortalShowLeagues: true, athletePortalShowDoublesRadar: true };
test("portal offers one destination per feature, including reservations and client account",()=>{
 const items=portalMenu(visibility,false);
 assert.equal(new Set(items.map(item=>item.section)).size,items.length);
 for(const section of ["home","booking","reservations","lessons","classes","leagues","radar","comandas","finance","announcements","profile"])assert(items.some(item=>item.section===section));
 assert.equal(items.filter(item=>item.section==="leagues").length,1);
 assert(!items.some(item=>item.section==="teacher"));
});
test("portal navigation honors arena visibility for both menu and app shortcuts",()=>{
 const items=portalMenu(Object.fromEntries(Object.keys(visibility).map(key=>[key,false])) as typeof visibility,false);
 assert.deepEqual(items.map(item=>item.section),["home","comandas","finance","announcements","profile"]);
});
test("teaching workspace is available only to the teacher",()=>{
 assert(portalMenu(visibility,true).some(item=>item.section==="teacher"));
 for(const flag of Object.keys(visibility) as (keyof typeof visibility)[]){
  const all=portalMenu(visibility,true);const restricted=portalMenu({...visibility,[flag]:false},true);
  assert.equal(restricted.length,all.length-1);
  assert(restricted.some(item=>item.section==="teacher"));
 }
});
