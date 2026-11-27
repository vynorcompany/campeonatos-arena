import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {agendaCourtsWhere} from '../src/lib/calendar/agenda-courts';
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL??'';
const enabled=/^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test('removing the last weekly range keeps an existing booking visible without exposing empty, cancelled or foreign courts',{skip:!enabled},async()=>{
 const db=new PrismaClient({datasources:{db:{url}}});const rollback=new Error('rollback synthetic court visibility');
 try{await assert.rejects(db.$transaction(async tx=>{
  const arena=await tx.arena.create({data:{name:'Visibility own',slug:'visibility-'+randomUUID(),createdById:'goal-test'}});
  const foreign=await tx.arena.create({data:{name:'Visibility foreign',slug:'visibility-'+randomUUID(),createdById:'goal-test'}});
  const court=async(name:string,arenaId=arena.id)=>tx.court.create({data:{name,arenaId}});
  const booked=await court('Booked without ranges'),configured=await court('Configured'),empty=await court('Empty'),cancelled=await court('Cancelled only'),outside=await court('Outside day'),other=await court('Foreign booked',foreign.id);
  const dayStart=new Date('2026-12-07T00:00:00Z'),dayEnd=new Date('2026-12-08T00:00:00Z');
  const booking=async(courtId:string,arenaId:string,status='SCHEDULED',startsAt=new Date('2026-12-07T12:00:00Z'))=>tx.scheduleOccurrence.create({data:{arenaId,sourceType:'BOOKING',title:'Visibility synthetic',startsAt,endsAt:new Date(startsAt.getTime()+3600000),status,occurrenceCourts:{create:{courtId}}}});
  const range=await tx.courtWeeklyRule.create({data:{courtId:booked.id,weekday:1,startsAtMinute:480,endsAtMinute:540,priceCents:1000,available:true}});
  await tx.courtWeeklyRule.create({data:{courtId:configured.id,weekday:1,startsAtMinute:480,endsAtMinute:540,priceCents:1000,available:true}});
  const saved=await booking(booked.id,arena.id);await booking(cancelled.id,arena.id,'CANCELED');await booking(outside.id,arena.id,'SCHEDULED',new Date('2026-12-08T12:00:00Z'));await booking(other.id,foreign.id);
  await tx.courtWeeklyRule.delete({where:{id:range.id}});
  await tx.$executeRaw`SELECT set_config('app.arena_id',${arena.id},true)`;await tx.$executeRawUnsafe('SET LOCAL ROLE arena_runtime');
  const rows=await tx.court.findMany({where:agendaCourtsWhere(arena.id,dayStart,dayEnd),select:{id:true}});
  assert.deepEqual(new Set(rows.map(row=>row.id)),new Set([booked.id,configured.id]));assert.equal(rows.some(row=>row.id===empty.id),false);
  assert.equal(await tx.scheduleOccurrence.count({where:{id:saved.id,status:'SCHEDULED'}}),1);
  assert.equal((await tx.court.findMany({where:agendaCourtsWhere(foreign.id,dayStart,dayEnd)})).length,0);
  throw rollback;
 },{timeout:30000}),error=>error===rollback);}finally{await db.$disconnect();}
});
