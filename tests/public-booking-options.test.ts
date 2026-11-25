import assert from "node:assert/strict";
import test from "node:test";
import {eligibleBookingDurations,serviceBookingIssue,type PublicBookingCourt,type PublicBookingSlot} from "../src/lib/calendar/public-booking-options";
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

const issue = (service = launcher, selectedCourt: PublicBookingCourt | undefined = court, selectedSlot: PublicBookingSlot | undefined = slot, minutes = 90, selectedServices = [service]) =>
  serviceBookingIssue({service,court:selectedCourt,slot:selectedSlot,durationMinutes:minutes,selectedServices,courts:[court]});

test("service feedback identifies the restricted court, day and complete time window", () => {
  assert.match(issue(launcher,{...court,id:"other"})!, /somente em: Elaine/);
  assert.match(issue(launcher,court,{...slot,startsAt:"2038-06-15T10:00"})!, /dia selecionado/);
  assert.match(issue(launcher,court,{...slot,label:"10:30",startsAt:"2038-06-14T10:30"})!, /07:30 e 11:30/);
  const legacy = {...launcher,rules:readServiceBookingRules({weekdays:[2]})};
  assert.match(issue(legacy)!, /dia selecionado/);
  assert.equal(issue(),null);
});

test("service feedback distinguishes minimum duration, exhausted capacity and overlapping services", () => {
  assert.match(issue({...launcher,rules:readServiceBookingRules({minimumMinutes:60})},court,slot,30)!, /pelo menos 60 minutos/);
  const occupied = {...launcher,busy:[{start:630,end:660}]};
  assert.match(issue(occupied)!, /unidades disponíveis/);
  assert.equal(issue({...launcher,busy:[{start:570,end:600},{start:690,end:720}]}),null);
  const other = {...launcher,id:"rackets",rules:readServiceBookingRules({courtIds:["other"]})};
  assert.match(issue(launcher,court,slot,90,[launcher,other])!, /demais serviços/);
  assert.match(issue(launcher,court,{...slot,blockedMinutes:[630]})!, /disponibilidade da quadra/);
});

test("service feedback agrees with availability including shorter intervals unlocked by the service", () => {
  for (const selectedSlot of [slot,{...slot,availableMinutes:[600],blockedMinutes:[630]}]) {
    for (const minutes of [30,60,90]) {
      assert.equal(issue(launcher,court,selectedSlot,minutes) === null,eligibleBookingDurations(court,selectedSlot,[launcher]).includes(minutes));
    }
  }
  assert.match(serviceBookingIssue({service:launcher,court:undefined,slot:undefined,durationMinutes:90,selectedServices:[launcher],courts:[court]})!, /Escolha uma quadra/);
});
