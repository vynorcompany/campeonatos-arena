import assert from "node:assert/strict";
import test from "node:test";
import {eligibleBookingDurations,type PublicBookingCourt,type PublicBookingSlot} from "../src/lib/calendar/public-booking-options";
import {readServiceBookingRules} from "../src/lib/calendar/service-booking-rules";
import type {PortalBookingService} from "../src/lib/calendar/service-capacity";
const slot:PublicBookingSlot={startsAt:"2038-06-14T10:00",label:"10:00",priceCents:2500,durationPrices:{30:2500,60:5000,90:7500},durations:[30,60,90],standardDurations:[90],availableMinutes:[600,630,660],blockedMinutes:[]};
const court:PublicBookingCourt={id:"elaine",name:"Elaine",color:"#174983",slotMinutes:30,slots:[slot]};
const launcher:PortalBookingService={id:"launcher",name:"Lançador",priceCents:5000,limit:1,busy:[],rules:readServiceBookingRules({minimumMinutes:30,courtIds:["elaine"],dailyWindows:[{weekday:1,startMinute:450,endMinute:690}]})};
test("short intervals require the qualifying service to actually be selected",()=>{
  assert.deepEqual(eligibleBookingDurations(court,slot,[]),[90]);
  assert.deepEqual(eligibleBookingDurations(court,{...slot,availableMinutes:[600],blockedMinutes:[630]},[]),[]);
  assert.deepEqual(eligibleBookingDurations(court,{...slot,availableMinutes:[600],blockedMinutes:[630]},[launcher]),[30]);
});
test("the entire minimum duration must fit before a reservation or closing time",()=>{
  assert.deepEqual(eligibleBookingDurations(court,{...slot,availableMinutes:[600,630],blockedMinutes:[660]},[]),[]);
  assert.deepEqual(eligibleBookingDurations(court,{...slot,availableMinutes:[600,660],blockedMinutes:[630]},[]),[]);
  assert.deepEqual(eligibleBookingDurations(court,slot,[]),[90]);
});
test("service capacity and court/day/time restrictions constrain complete intervals",()=>{
  assert.deepEqual(eligibleBookingDurations({...court,id:"agecon"},slot,[launcher]),[]);
  assert.deepEqual(eligibleBookingDurations(court,{...slot,startsAt:"2038-06-15T10:00"},[launcher]),[]);
  assert.deepEqual(eligibleBookingDurations(court,slot,[{...launcher,busy:[{start:630,end:660}]}]),[30]);
  assert.deepEqual(eligibleBookingDurations(court,slot,[{...launcher,busy:[{start:570,end:600}]}]),[30,60,90]);
});
