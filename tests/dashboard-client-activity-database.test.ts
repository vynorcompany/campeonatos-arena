import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {PrismaClient} from "@prisma/client";
import {loadClientActivity} from "../src/lib/reports/client-activity";
import {readArenaData} from "../src/lib/assistant/read-data";
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL||"";
const enabled=/^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("120-day client activity and assistant reads remain scoped, ignore future/voided movements and use actual receipts",{skip:!enabled},async()=>{
 const db=new PrismaClient({datasources:{db:{url}}});const runtimeUrl=new URL(url);runtimeUrl.username="arena_runtime";const runtime=new PrismaClient({datasources:{db:{url:runtimeUrl.toString()}}});const ids:string[]=[];
 const now=new Date("2026-11-01T15:00:00Z"),old=new Date(now.getTime()-121*86400000);
 try{
  for(const label of ["A","B"])ids.push((await db.arena.create({data:{name:`Activity ${label}`,slug:`activity-${randomUUID()}`,createdById:"goal-test"}})).id);
  const names=["Recent QA","Old QA","No movement QA","Voided QA","Future QA","Archived QA"];
  const players=await Promise.all(names.map((name,i)=>db.player.create({data:{arenaId:ids[0],name,active:i!==5}})));
  for(const i of [0,1,3,4,5])await db.financialEntry.create({data:{arenaId:ids[0],playerId:players[i].id,type:i===0?"INCOME":"REVENUE",category:"COMANDAS",description:names[i],amountCents:2500,status:i===3?"VOIDED":"PAID",createdAt:old,paidAt:i===1?old:i===4?new Date(now.getTime()+86400000):new Date("2026-11-01T01:30:00Z")}});
  const foreign=await db.player.create({data:{arenaId:ids[1],name:"Foreign private QA"}});await db.financialEntry.create({data:{arenaId:ids[1],playerId:foreign.id,type:"REVENUE",category:"COMANDAS",description:"Foreign financial QA",amountCents:999999,status:"PAID",paidAt:new Date("2026-11-01T01:30:00Z")}});
  const scope=<T,>(fn:(tx:any)=>Promise<T>)=>runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id', ${ids[0]}, true)`;return fn(tx);});
  const activity=await scope(tx=>loadClientActivity(tx,ids[0],now));assert.deepEqual(activity.active.map(p=>p.name),["Recent QA"]);assert.equal(activity.inactive.length,5);
  const reply=await scope(tx=>readArenaData(tx,ids[0],"fluxo de caixa de ontem",()=>true,now));assert.match(reply!,/25,00/);assert.doesNotMatch(reply!,/Foreign|9\.999/);
  const clients=await scope(tx=>readArenaData(tx,ids[0],"clientes inativos",()=>true,now));assert.match(clients!,/Old QA/);assert.doesNotMatch(clients!,/Recent QA|Foreign/);
  await assert.rejects(scope(tx=>readArenaData(tx,ids[0],"fluxo de caixa",()=>false,now)),/permissão/);
  const products=await scope(tx=>readArenaData(tx,ids[0],'clientes "Recent"',()=>true,now));assert.match(products!,/Recent QA/);assert.doesNotMatch(products!,/Old QA|Foreign/);
 }finally{await db.financialEntry.deleteMany({where:{arenaId:{in:ids}}});await db.arena.deleteMany({where:{id:{in:ids}}});await runtime.$disconnect();await db.$disconnect();}
});
