import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { instantToArenaWallClock } from "../src/lib/calendar/arena-wall-clock";
import { registerCourtCheckin, registerSelectedCourtCheckins } from "../src/lib/checkin/register";
import { shareCheckinGame } from "../src/lib/checkin/share-game";
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL??"";
const local=/^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("convidados entram no próprio jogo sem trocar responsável, cobrança ou permissões de grupo; link fica restrito ao responsável",{skip:!local},async()=>{
  const db=new PrismaClient({datasources:{db:{url}}});
  const runtime=new PrismaClient({datasources:{db:{url:url.replace("postgres@","arena_runtime@")}}});
  const arenas:string[]=[];
  const scope=<T>(arenaId:string,fn:(tx:Prisma.TransactionClient)=>Promise<T>)=>runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id',${arenaId},true)`;return fn(tx);});
  try {
    const token=randomBytes(32).toString("hex");
    const arena=await db.arena.create({data:{name:"Jogo QA",slug:`join-${randomUUID()}`,createdById:"goal-test",checkinEnabled:true,checkinMode:"GROUP",checkinToken:token}});arenas.push(arena.id);
    const other=await db.arena.create({data:{name:"Outra QA",slug:`join-${randomUUID()}`,createdById:"goal-test",checkinEnabled:true,checkinToken:randomBytes(32).toString("hex")}});arenas.push(other.id);
    const players=await Promise.all(["Responsável","Convidado 1","Convidado 2","Convidado 3","Visitante"].map(name=>db.player.create({data:{arenaId:arena.id,name}})));
    const foreign=await db.player.create({data:{arenaId:other.id,name:"Outra arena"}});
    const court=await db.court.create({data:{arenaId:arena.id,name:"Elaine"}});
    const now=new Date(),wall=instantToArenaWallClock(now);
    const entry=await db.financialEntry.create({data:{arenaId:arena.id,playerId:players[0].id,type:"REVENUE",category:"Reservas",description:"Reserva QA",amountCents:15000,dueDate:wall}});
    const create=(sourceType="BOOKING",status="SCHEDULED",offset=0)=>db.scheduleOccurrence.create({data:{arenaId:arena.id,sourceType,status,title:"Jogo QA",responsiblePlayerId:players[0].id,startsAt:new Date(wall.getTime()+offset),endsAt:new Date(wall.getTime()+offset+90*60000),occurrenceCourts:{create:{courtId:court.id}},participants:{create:{playerId:players[0].id,amountCents:15000,...(sourceType==="BOOKING"&&offset===0&&status==="SCHEDULED"?{financialEntryId:entry.id}:{})}}}});
    const game=await create();
    const input={arenaId:arena.id,token,occurrenceId:game.id,courtId:court.id,playerId:players[1].id};
    await assert.rejects(scope(arena.id,tx=>registerCourtCheckin(tx,input,now)),/vinculados/);
    const receipts=await Promise.all([1,2].map(()=>scope(arena.id,tx=>registerCourtCheckin(tx,{...input,joinOwnGame:true},now))));
    assert.equal(receipts[0].id,receipts[1].id);
    await assert.rejects(scope(arena.id,tx=>registerSelectedCourtCheckins(tx,{...input,playerIds:[players[2].id]},now)),/vinculados/);
    for(const player of players.slice(2,4))await scope(arena.id,tx=>registerCourtCheckin(tx,{...input,playerId:player.id,joinOwnGame:true},now));
    assert.equal(await db.scheduleParticipant.count({where:{occurrenceId:game.id}}),4);
    assert.equal(await db.checkinRecord.count({where:{occurrenceId:game.id}}),3);
    assert.equal((await db.scheduleOccurrence.findUniqueOrThrow({where:{id:game.id}})).responsiblePlayerId,players[0].id);
    const owner=await db.scheduleParticipant.findUniqueOrThrow({where:{occurrenceId_playerId:{occurrenceId:game.id,playerId:players[0].id}}});
    assert.equal(owner.amountCents,15000);assert.equal(owner.financialEntryId,entry.id);
    assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:entry.id}})).amountCents,15000);
    for(const player of players.slice(1,4)){const p=await db.scheduleParticipant.findUniqueOrThrow({where:{occurrenceId_playerId:{occurrenceId:game.id,playerId:player.id}}});assert.equal(p.amountCents,0);assert.equal(p.financialEntryId,null);assert.ok(p.checkedInAt);}
    const sharing={arenaId:arena.id,arenaSlug:arena.slug,occurrenceId:game.id,playerId:players[0].id};
    const link=await scope(arena.id,tx=>shareCheckinGame(tx,sharing,now));assert.ok(link.path?.includes(`jogo=${game.id}`));assert.ok(link.path?.includes(`token=${token}`));
    assert.match((await scope(arena.id,tx=>shareCheckinGame(tx,{...sharing,playerId:players[1].id},now))).error??"",/responsável/);
    assert.ok((await scope(other.id,tx=>shareCheckinGame(tx,{...sharing,arenaId:other.id,playerId:foreign.id},now))).error);
    const invalidGames=[await create("BLOCK"),await create("BOOKING","CANCELED"),await create("ONLINE_BOOKING","PENDING_PAYMENT"),await create("BOOKING","SCHEDULED",2*3600000)];
    const classBooking=await create("COURT_BOOKING");await db.scheduleOccurrence.update({where:{id:classBooking.id},data:{bookingTypeName:"Aula"}});invalidGames.push(classBooking);
    for(const invalid of invalidGames)await assert.rejects(scope(arena.id,tx=>registerCourtCheckin(tx,{...input,playerId:players[4].id,occurrenceId:invalid.id,joinOwnGame:true},now)),/disponível/);
    await assert.rejects(scope(arena.id,tx=>registerCourtCheckin(tx,{...input,playerId:foreign.id,joinOwnGame:true},now)),/ativo/);
    // Joining a legacy game must not promote a guest over its existing first athlete.
    const legacy=await create("COURT_BOOKING");await db.scheduleOccurrence.update({where:{id:legacy.id},data:{responsiblePlayerId:null}});
    await scope(arena.id,tx=>registerCourtCheckin(tx,{...input,playerId:players[4].id,occurrenceId:legacy.id,joinOwnGame:true},now));
    assert.equal((await db.scheduleOccurrence.findUniqueOrThrow({where:{id:legacy.id}})).responsiblePlayerId,players[0].id);
    await db.arena.update({where:{id:arena.id},data:{checkinToken:randomBytes(32).toString("hex")}});
    await assert.rejects(scope(arena.id,tx=>registerCourtCheckin(tx,{...input,joinOwnGame:true},now)),/QR Code/);
    await db.arena.update({where:{id:arena.id},data:{checkinEnabled:false}});
    assert.ok((await scope(arena.id,tx=>shareCheckinGame(tx,sharing,now))).error);
  } finally {await db.scheduleOccurrence.deleteMany({where:{arenaId:{in:arenas}}});await db.arena.deleteMany({where:{id:{in:arenas}}});await runtime.$disconnect();await db.$disconnect();}
});
