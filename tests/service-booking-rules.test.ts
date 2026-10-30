import assert from "node:assert/strict";
import test from "node:test";
import { readServiceBookingRules, servicePermitsDuration, servicePermitsInterval, serviceRuleDetails } from "../src/lib/calendar/service-booking-rules";
test("court durations remain unchanged without a qualifying selected service",()=>{
 const launcher={rules:readServiceBookingRules({minimumMinutes:30,courtIds:['elaine'],startMinute:420,endMinute:720,weekdays:[1]})};
 assert.equal(servicePermitsDuration([90],30,[],'elaine',1,600,30),false);
 assert.equal(servicePermitsDuration([90],30,[launcher],'elaine',1,600,30),true);
 assert.equal(servicePermitsDuration([90],60,[launcher],'elaine',1,600,30),true);
 assert.equal(servicePermitsDuration([90],30,[launcher],'origem',1,600,30),false);
 assert.equal(servicePermitsDuration([90],30,[launcher],'elaine',2,600,30),false);
 assert.equal(servicePermitsDuration([90],90,[launcher],'elaine',1,660,30),false);
 assert.equal(servicePermitsDuration([90],30,[launcher],'elaine',1,690,30),true);
 assert.equal(servicePermitsDuration([90],30,[launcher],'elaine',1,720,30),false);
 assert.equal(servicePermitsDuration([90],45,[launcher],'elaine',1,600,30),false);
});
test("multiple selected services must all permit the complete booking",()=>{
 const a={rules:readServiceBookingRules({minimumMinutes:30})},b={rules:readServiceBookingRules({minimumMinutes:60})};
 assert.equal(servicePermitsDuration([90],30,[a,b],'court',1,600,30),false);
 assert.equal(servicePermitsDuration([90],60,[a,b],'court',1,600,30),true);
 assert.equal(servicePermitsInterval(readServiceBookingRules({}),'court',0,1410,60),false);
 assert.throws(()=>readServiceBookingRules({startMinute:720,endMinute:420}));
});

test("service conditions group complete weeks and order partial days consistently",()=>{
 const courts=[{id:'elaine',name:'Elaine'}];
 const all=serviceRuleDetails(readServiceBookingRules({courtIds:['elaine'],weekdays:[0,1,2,3,4,5,6],startMinute:450,endMinute:690}),courts);
 assert.deepEqual(all,[{label:'Quadras',value:'Elaine'},{label:'Dias',value:'Todos os dias'},{label:'Horário',value:'07:30 às 11:30'}]);
 assert.equal(serviceRuleDetails(readServiceBookingRules({weekdays:[0,5,1]}),courts)[1].value,'Seg · Sex · Dom');
 assert.equal(serviceRuleDetails(readServiceBookingRules({}),courts)[0].value,'Todas as quadras');
});
