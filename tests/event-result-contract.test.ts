import assert from 'node:assert/strict';
import test from 'node:test';
import {eventResultInputSchema,eventResultOutcomeSchema} from '../src/lib/backend/contracts/event-results';
import {clientMutationInputSchema} from '../src/lib/backend/contracts/client-mutations';
test('event result contracts distinguish scalar scores and two-athlete formations without accepting authority',()=>{
 for(const operation of ['match','trio']as const){const fields={arenaSlug:['arena'],matchId:['m'],homeScore:['6'],awayScore:['2'],...(operation==='trio'?{homePlayerIds:['a','b'],awayPlayerIds:['c','d'],gameNumber:['1']}:{})};assert.ok(eventResultInputSchema(operation).safeParse({fields}).success);assert.equal(eventResultInputSchema(operation).safeParse({fields:{...fields,playerId:['forged']}}).success,false);assert.equal(eventResultInputSchema(operation).safeParse({fields:{...fields,matchId:['m','other']}}).success,false);}
 assert.equal(eventResultInputSchema('match').safeParse({fields:{arenaSlug:['arena'],homePlayerIds:['a','b']}}).success,false);assert.equal(eventResultInputSchema('trio').safeParse({fields:{arenaSlug:['arena'],homePlayerIds:['a']}}).success,false);
 assert.ok(eventResultOutcomeSchema.safeParse({success:true,matchId:'m',homeScore:2,awayScore:1}).success);assert.equal(eventResultOutcomeSchema.safeParse({success:true,matchId:'m',homeScore:2,awayScore:1,internalSQL:'private'}).success,false);
});
test('dependent creation accepts only registration fields and no arena or ledger authority',()=>{
 const schema=clientMutationInputSchema('dependent');assert.ok(schema.safeParse({fields:{name:['Menor API'],guardianId:['own'],birthDate:['2015-01-02']}}).success);for(const key of ['arenaId','playerId','billingPlayerId','points'])assert.equal(schema.safeParse({fields:{guardianId:['own'],[key]:['forged']}}).success,false);assert.equal(schema.safeParse({fields:{guardianId:['one','two']}}).success,false);
});
