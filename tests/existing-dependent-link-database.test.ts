import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { linkExistingDependent } from "../src/lib/clients/dependents";
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL??"";
const enabled=/^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("links an existing client without recreating their profile or moving historical debts; rejects foreign and conflicting family links",{skip:!enabled},async()=>{
 const p=new PrismaClient({datasources:{db:{url}}});const rollback=new Error("rollback dependent fixtures");
 try{await assert.rejects(p.$transaction(async tx=>{
  const arena=await tx.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}});const foreign=await tx.arena.findUniqueOrThrow({where:{slug:"arena-beta-goal"}});
  await tx.$executeRaw`SELECT set_config('app.arena_id',${arena.id},true)`;
  const suffix=randomUUID();
  const parent=await tx.player.create({data:{arenaId:arena.id,name:`Pai ${suffix}`}}),other=await tx.player.create({data:{arenaId:arena.id,name:`Outro pai ${suffix}`}}),child=await tx.player.create({data:{arenaId:arena.id,name:`Filho ${suffix}`,email:"child@example.test",birthDate:new Date("2010-02-10T12:00:00Z")}});
  const entry=await tx.financialEntry.create({data:{arenaId:arena.id,playerId:child.id,type:"REVENUE",category:"Aulas",description:"Histórico do dependente",amountCents:1234}});
  const count=await tx.player.count({where:{arenaId:arena.id}});
  await linkExistingDependent(tx,arena.id,parent.id,child.id);
  const linked=await tx.player.findUniqueOrThrow({where:{id:child.id}});assert.equal(linked.guardianId,parent.id);assert.equal(linked.email,child.email);assert.deepEqual(linked.birthDate,child.birthDate);
  assert.equal(await tx.player.count({where:{arenaId:arena.id}}),count);assert.equal((await tx.financialEntry.findUniqueOrThrow({where:{id:entry.id}})).amountCents,1234);
  await assert.rejects(linkExistingDependent(tx,arena.id,other.id,child.id),/outro responsável/);
  await assert.rejects(linkExistingDependent(tx,arena.id,parent.id,parent.id),/si mesmo/);
  await assert.rejects(linkExistingDependent(tx,arena.id,child.id,parent.id),/sem outro responsável|dependentes/);
  const outside=await tx.player.create({data:{arenaId:foreign.id,name:`Fora ${suffix}`}});
  await assert.rejects(linkExistingDependent(tx,arena.id,parent.id,outside.id),/cliente ativo desta arena/);
  assert.equal((await tx.player.findUniqueOrThrow({where:{id:child.id}})).guardianId,parent.id);
  throw rollback;
 },{timeout:30000}),error=>error===rollback);}finally{await p.$disconnect();}
});
