import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("individual registration links clients and supports local payment without online charges", { skip: !enabled, timeout: 120000 }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [], require = createRequire(import.meta.url), cache = new Map<string, any>();
  const payments: any[] = [];
  let arenaId = "";
  const scope = (id: string, callback: any) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`; return callback(tx); });
  function load(file: string): any {
    const absolute = path.resolve(file); if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, console, process, FormData, Date, Error,
      require(name: string) {
        if (name === "server-only" || name === "next/cache") return { revalidatePath() {} };
        if (name === "@/lib/auth/guards") return { requirePermission: async () => ({ arenaId }) };
        if (name === "@/lib/tournament/revalidation") return { refreshTournamentRoutes() {} };
        if (name === "@/lib/env") return { env: { appUrl: "http://localhost:3011" } };
        if (name === "@/lib/payments/mercado-pago") return { createHostedCheckout: async (input: any) => { payments.push({ ...input, hosted: true }); return { provider: "MERCADO_PAGO", reference: "qa-hosted", paymentId: "qa-hosted", qrCode: "", qrCodeBase64: "", checkoutUrl: "https://checkout.example.test/qa", expiresAt: null }; }, createPixPayment: async (input: any) => { payments.push(input); return { provider: "MERCADO_PAGO", reference: "qa-payment", paymentId: "qa-payment", qrCode: "qa-only", qrCodeBase64: "", checkoutUrl: "", expiresAt: null }; } };
        if (name === "@/lib/prisma") return { prisma: runtime };
        if (name === "@/lib/rls") return { setArenaRlsContext: (tx: any, id: string) => tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`, withArenaTransaction: scope };
        if (name.startsWith("@/")) return load("src/" + name.slice(2) + ".ts");
        return require(name);
      },
    }, { filename: absolute }); return exports;
  }
  const data = (values: Record<string, string>) => { const form = new FormData(); for (const [key, value] of Object.entries(values)) form.set(key, value); return form; };
  try {
    for (let i=0;i<2;i++) arenas.push((await admin.arena.create({ data: { name:"Local event QA", slug:"local-event-qa-"+randomUUID(), createdById:"goal-test" } })).id);
    arenaId=arenas[0];
    const event=await admin.tournament.create({ data: {arenaId,name:"Day use local",creationMode:"PUBLIC",onlinePaymentEnabled:false} });
    const category=await admin.tournamentCategory.create({data:{tournamentId:event.id,name:"Day use",level:1,registrationType:"INDIVIDUAL",priceFirstCents:8000}});
    const second=await admin.tournamentCategory.create({data:{tournamentId:event.id,name:"Outro day use",level:2,registrationType:"INDIVIDUAL",priceFirstCents:5000}});
    const existing=await admin.player.create({data:{arenaId,name:"José Atleta",phone:"+55 (42) 99999-1234",cpf:"52998224725",email:"kept@example.test"}});
    const foreign=await admin.player.create({data:{arenaId:arenas[1],name:"José Atleta",phone:"42999991234"}});
    const {createPublicRegistrationAction:register}=load("src/lib/actions/public-registration.ts");
    const fields={tournamentSlug:event.publicSlug,categoryId:category.id,registrationType:"INDIVIDUAL",leadName:"Jose Atleta",leadPhone:"42999991234"};
    const result=await register({},data(fields)); assert.equal(result.error,null);
    const registration=await admin.publicTournamentRegistration.findUniqueOrThrow({where:{id:result.registrationId}});
    assert.equal(registration.leadPlayerId,existing.id); assert.equal(registration.status,"CONFIRMED"); assert.equal(registration.paymentStatus,"PENDING"); assert.equal(registration.paymentProvider,"PAY_ON_SITE"); assert.equal(registration.amountCents,8000); assert.equal(registration.holdExpiresAt,null); assert.equal(registration.paymentBankAccountId,null); assert.equal(payments.length,0);
    const originalDebt=await admin.financialEntry.findFirstOrThrow({where:{arenaId,source:"TOURNAMENT_REGISTRATION",externalReference:registration.id},include:{settlements:true}});
    assert.equal(originalDebt.status,"PENDING"); assert.equal(originalDebt.amountCents,8000); assert.equal(originalDebt.playerId,existing.id); assert.equal(originalDebt.settlements.length,0); assert.ok(originalDebt.dueDate);
    assert.equal(await admin.player.count({where:{arenaId}}),1); assert.equal((await admin.player.findUniqueOrThrow({where:{id:existing.id}})).email,"kept@example.test");
    assert.match((await register({},data(fields))).error,/já está inscrito/);
    const created=await register({},data({...fields,leadName:"Novo Atleta",leadPhone:"42999991235"})); assert.equal(created.error,null);
    const newRegistration=await admin.publicTournamentRegistration.findUniqueOrThrow({where:{id:created.registrationId}});
    const newClient=await admin.player.findUniqueOrThrow({where:{id:newRegistration.leadPlayerId!}}); assert.equal(newClient.name,"Novo Atleta"); assert.equal(newClient.phone,"42999991235"); assert.equal(newClient.cpf,""); assert.equal(newClient.email,""); assert.equal(newRegistration.leadCpf,"");
    // Separate people may share a family phone; never attach one name to another profile.
    const family=await register({},data({...fields,leadName:"Familiar Atleta",leadPhone:"42999991235"})); assert.equal(family.error,null);
    assert.notEqual((await admin.publicTournamentRegistration.findUniqueOrThrow({where:{id:family.registrationId}})).leadPlayerId,newClient.id);
    await assert.rejects(scope(arenaId,(tx:any)=>tx.publicTournamentRegistration.update({where:{id:registration.id},data:{leadPlayerId:foreign.id}})),/mesma arena|constraint/);
    const concurrent=await Promise.all([register({},data({...fields,categoryId:second.id,leadName:"Concorrente Atleta",leadPhone:"42999991236"})),register({},data({...fields,categoryId:second.id,leadName:"Concorrente Atleta",leadPhone:"42999991236"}))]);
    assert.equal(concurrent.filter(r=>!r.error).length,1); assert.equal(await admin.player.count({where:{arenaId,name:"Concorrente Atleta"}}),1);
    const bank=await admin.bankAccount.create({data:{arenaId,name:"Caixa QA",active:true}});
    const foreignBank=await admin.bankAccount.create({data:{arenaId:arenas[1],name:"Outra arena",active:true}});
    const {receiveOnsiteTournamentRegistration:receive}=load("src/lib/tournaments/onsite-registration-receipt.ts");
    await assert.rejects(scope(arenaId,(tx:any)=>receive(tx,{arenaId,registrationId:registration.id,bankAccountId:foreignBank.id,paidAt:new Date()})),/conta bancária ativa/);
    await Promise.all([scope(arenaId,(tx:any)=>receive(tx,{arenaId,registrationId:registration.id,bankAccountId:bank.id,paidAt:new Date("2026-11-17T12:00:00Z")})),scope(arenaId,(tx:any)=>receive(tx,{arenaId,registrationId:registration.id,bankAccountId:bank.id,paidAt:new Date("2026-11-17T12:00:00Z")}))]);
    assert.equal((await admin.publicTournamentRegistration.findUniqueOrThrow({where:{id:registration.id}})).paymentStatus,"PAID");
    const receipts=await admin.financialEntry.findMany({where:{arenaId,source:"TOURNAMENT_REGISTRATION",externalReference:registration.id},include:{settlements:true}}); assert.equal(receipts.length,1); assert.equal(receipts[0].id,originalDebt.id); assert.equal(receipts[0].amountCents,8000); assert.equal(receipts[0].playerId,existing.id); assert.equal(receipts[0].settlements.length,1);
    await admin.tournament.update({where:{id:event.id},data:{onlinePaymentEnabled:true}});
    await admin.arenaOperationalSettings.upsert({where:{arenaId},create:{arenaId,portalPaymentBankAccountId:bank.id},update:{portalPaymentBankAccountId:bank.id}});
    const hosted=await register({},data({...fields,leadName:"Online Atleta",leadPhone:"42999991237",paymentMethod:"PIX"})); assert.equal(hosted.error,null); assert.equal(hosted.redirectToCheckout,true); assert.equal(hosted.paymentMethod,"PIX"); assert.equal(payments.length,1); assert.equal(payments[0].hosted,true); assert.equal(payments[0].payerEmail,""); assert.equal(payments[0].paymentTypes.pix,true); assert.equal(payments[0].paymentTypes.creditCard,false);
    const held=await admin.publicTournamentRegistration.findUniqueOrThrow({where:{id:hosted.registrationId}}); assert.equal(held.status,"PENDING_PAYMENT"); assert.equal(held.mercadoPagoPaymentId, "", "hosted preference is not a payment id"); assert.ok(held.holdExpiresAt);
    await admin.tournament.update({where:{id:event.id},data:{onlinePaymentEnabled:false}});
    assert.equal((await admin.publicTournamentRegistration.findUniqueOrThrow({where:{id:held.id}})).paymentCheckoutUrl,held.paymentCheckoutUrl);
    await assert.rejects(scope(arenaId,(tx:any)=>receive(tx,{arenaId,registrationId:held.id,bankAccountId:bank.id,paidAt:new Date()})),/não encontrada/);
    assert.equal(await admin.pair.count({where:{tournamentId:event.id}}),0);
    const pairCategory=await admin.tournamentCategory.create({data:{tournamentId:event.id,name:"Duplas local",level:3,priceFirstCents:5000}});
    const pair=await register({},data({tournamentSlug:event.publicSlug,categoryId:pairCategory.id,registrationType:"PAIR",leadName:"Dupla Primeiro",leadPhone:"42999991238",leadCpf:"11144477735",leadEmail:"pair@example.test",partnerName:"Dupla Segundo",partnerPhone:"42999991239",partnerCpf:"12345678909"})); assert.equal(pair.error,null); assert.equal(pair.amountCents,10000); assert.equal(await admin.pair.count({where:{tournamentId:event.id}}),1);
    const trioCategory=await admin.tournamentCategory.create({data:{tournamentId:event.id,name:"Trio local",level:4,priceFirstCents:2500}});
    await admin.categoryCompetition.create({data:{categoryId:trioCategory.id,format:"TRIO",status:"DRAFT",isPublic:true}});
    const trio=await register({},data({tournamentSlug:event.publicSlug,categoryId:trioCategory.id,registrationType:"PAIR",leadName:"Trio Primeiro",leadPhone:"42999991240",leadCpf:"11111111111",leadEmail:"trio@example.test",partnerName:"Trio Segundo",partnerPhone:"42999991241",partnerCpf:"22222222222",thirdName:"Trio Terceiro",thirdPhone:"42999991242",thirdCpf:"33333333333"})); assert.equal(trio.error,null); assert.equal(trio.amountCents,7500); assert.equal((await admin.publicTournamentRegistration.findUniqueOrThrow({where:{id:trio.registrationId}})).paymentStatus,"PENDING");
    assert.equal(await admin.categoryPair.count({where:{competition:{categoryId:trioCategory.id}}}),1);
    assert.equal(payments.length,1,"local payment never calls the online provider, including teams");
    const {updateTournamentAction:updateEvent}=load("src/lib/actions/tournament/events.ts");
    const edit={tournamentId:event.id,name:"Day use local",description:"",rules:""};
    assert.equal((await updateEvent({},data(edit))).error,null);
    assert.equal((await admin.tournament.findUniqueOrThrow({where:{id:event.id}})).onlinePaymentEnabled,false,"legacy event edits preserve the setting");
    assert.equal((await updateEvent({},data({...edit,onlinePaymentEnabledPresent:"true",onlinePaymentEnabled:"on"}))).error,null);
    assert.equal((await admin.tournament.findUniqueOrThrow({where:{id:event.id}})).onlinePaymentEnabled,true);
    assert.equal((await updateEvent({},data({...edit,onlinePaymentEnabledPresent:"true"}))).error,null);
    assert.equal((await admin.tournament.findUniqueOrThrow({where:{id:event.id}})).onlinePaymentEnabled,false);

  } finally {
    await admin.categoryCompetition.deleteMany({where:{category:{tournament:{arenaId:{in:arenas}}}}});
    await admin.arena.deleteMany({where:{id:{in:arenas}}}); await runtime.$disconnect(); await admin.$disconnect();
  }
});
