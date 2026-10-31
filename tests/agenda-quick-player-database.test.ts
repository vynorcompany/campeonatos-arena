import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient, type Prisma } from "@prisma/client";
import * as validators from "../src/lib/validators/player";
import * as phone from "../src/lib/phone";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("quick client registration accepts absent optional fields, stores profile and enforces tenant scope", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = [];
  try {
    for (let i=0;i<2;i++) ids.push((await admin.arena.create({data:{name:"Quick client QA",slug:`quick-client-${randomUUID()}`,createdById:"goal-test"}})).id);
    const require = createRequire(import.meta.url);
    const exports: {createQuickPlayerAction?: (form: FormData)=>Promise<{id:string;name:string;error?:never}|{error:string;id?:never;name?:never}>} = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/calendar.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
      exports, FormData, Date, Error,
      require(name:string) {
        if(name==="@/lib/auth/guards")return {requirePermission:async(key:string)=>{assert.equal(key,"players:create");return {arenaId:ids[0]};}};
        if(name==="@/lib/validators/player")return validators;
        if(name==="@/lib/phone")return phone;
        if(name==="@/lib/calendar/revalidation")return {refreshCalendarRoutes(){}};
        if(name==="@/lib/rls")return {withArenaTransaction: <T>(arenaId:string,run:(tx:Prisma.TransactionClient)=>Promise<T>)=>runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;return run(tx);})};
        return name.startsWith("@/")?{}:require(name);
      }
    });
    const form = (values:Record<string,string>)=>{const data=new FormData();for(const [key,value]of Object.entries(values))data.set(key,value);return data;};
    await admin.player.create({data:{arenaId:ids[1],name:"Outra arena",phone:"47999990001"}});
    const minimal=await exports.createQuickPlayerAction!(form({name:"Cliente Inicial",phone:"(47) 99999-0001"}));
    const saved=await admin.player.findUniqueOrThrow({where:{id:minimal.id}});
    assert.equal(saved.arenaId,ids[0]);assert.equal(saved.phone,"47999990001");assert.equal(saved.cpf,"");assert.equal(saved.birthDate,null);
    const full=await exports.createQuickPlayerAction!(form({name:"Cliente Completo",phone:"47999990002",email:"client@example.test",cpf:"529.982.247-25",birthDate:"1995-06-15",class:"B",gender:"Feminino"}));
    const profile=await admin.player.findUniqueOrThrow({where:{id:full.id}});
    assert.equal(profile.email,"client@example.test");assert.equal(profile.cpf,"52998224725");assert.equal(profile.class,"B");assert.equal(profile.gender,"Feminino");assert.equal(profile.birthDate?.toISOString().slice(0,10),"1995-06-15");
    assert.match((await exports.createQuickPlayerAction!(form({name:"Outro Cliente",phone:"55 47 99999-0001"}))).error ?? "", /Já existe/);
    assert.match((await exports.createQuickPlayerAction!(form({name:"Cliente Inválido",phone:"47999990003",email:"invalido"}))).error ?? "", /E-mail inválido/);
    assert.equal(await admin.player.count({where:{arenaId:ids[0]}}),2);
  } finally {await admin.arena.deleteMany({where:{id:{in:ids}}});await runtime.$disconnect();await admin.$disconnect();}
});
