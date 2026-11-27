import assert from 'node:assert/strict';
import test from 'node:test';
import {portalAccountInputSchema,portalPaymentOutcomeSchema,portalAccountOutcomes} from '../src/lib/backend/contracts/portal-account';
import {portalOccupancySchema,ownPrivacyRequestsSchema} from '../src/lib/backend/contracts/portal-support';

test('Portal account contracts reject forged ownership, duplicate scalar fields and unexpected files',()=>{
 for(const operation of ['profile','availability','partner','privacy','payment'] as const){
  const schema=portalAccountInputSchema(operation);
  assert.ok(schema.safeParse({fields:{arenaSlug:['arena']}}).success);
  for(const fields of [{arenaSlug:['arena'],playerId:['foreign']},{arenaSlug:['arena'],arenaId:['foreign']},{arenaSlug:['a','b']},{arenaSlug:['']},{arenaSlug:['arena'],password:['a','b']}])assert.equal(schema.safeParse({fields}).success,false);
  if(operation!=='profile')assert.equal(schema.safeParse({fields:{arenaSlug:['arena']},file:{name:'x',type:'image/png',base64:'AAAA'}}).success,false);
 }
 assert.equal(portalAccountInputSchema('payment').safeParse({fields:{arenaSlug:['arena'],entryId:Array.from({length:51},()=> 'id')}}).success,false);
 assert.equal(portalAccountInputSchema('profile').safeParse({fields:{arenaSlug:['arena']},file:{name:'x',type:'image/png',base64:'bad%'}}).success,false);
});

test('checkout URLs reject executable, credentialed and ambiguous redirects',()=>{
 for(const checkoutUrl of ['javascript:alert(1)','data:text/html,unsafe','//outside.example','https://user:password@example.com','/\\outside.example','https://example.com/\nunsafe'])assert.equal(portalPaymentOutcomeSchema.safeParse({checkoutUrl}).success,false);
 for(const checkoutUrl of ['/checkout/own','https://payments.example/checkout'])assert.ok(portalPaymentOutcomeSchema.safeParse({checkoutUrl}).success);
 assert.equal(portalAccountOutcomes.profile.safeParse({error:null,success:'ok',passwordHash:'secret'}).success,false);
 assert.equal(ownPrivacyRequestsSchema.safeParse({authenticated:true,requests:[{id:'own',kind:'ACCESS',status:'PENDING',createdAt:new Date().toISOString(),response:'',passwordHash:'secret'}]}).success,false);
});

test('occupancy cells cannot include private athlete fields or mismatch the court columns',()=>{
 const data={selectedDate:'2026-11-27',previousDate:'2026-11-26',nextDate:'2026-11-28',onlineBookingEnabled:true,courts:[{id:'court',name:'Quadra'}],rows:[{minute:420,label:'07:00',states:['FREE']}]};
 assert.ok(portalOccupancySchema.safeParse(data).success);
 assert.equal(portalOccupancySchema.safeParse({...data,rows:[{minute:420,label:'07:00',states:[]}]}).success,false);
 assert.equal(portalOccupancySchema.safeParse({...data,rows:[{...data.rows[0],playerId:'private'}]}).success,false);
});
