import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { buildFocusNfce } from "../src/lib/fiscal/focus-payload";
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL??"";
const enabled=/^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
class FakeHttpError extends Error { constructor(public status:number,public providerCode:string){super("HTTP failure");} }
test("Focus outbox: arena isolation, immutable payload, retry lookup after timeout, lease and authorization/cancellation",{skip:!enabled},async()=>{
 const p=new PrismaClient({datasources:{db:{url}}});const rollback=new Error("rollback Focus fixtures");
 try { await assert.rejects(p.$transaction(async tx=>{
  const arena=await tx.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}}),foreign=await tx.arena.findUniqueOrThrow({where:{slug:"arena-beta-goal"}});
  const profile={ncm:"22021000",origin:"0",gtin:"SEM GTIN",gtinTrib:"SEM GTIN",commercialUnit:"UN",tributaryUnit:"UN",tributaryFactor:"1",cfop:"5102",icmsCode:"102",pisCst:"99",pisRate:"0",cofinsCst:"99",cofinsRate:"0"};
  await tx.fiscalSettings.upsert({where:{arenaId:arena.id},create:{arenaId:arena.id,provider:"FOCUS",enabled:true,crt:"1",issuerState:"PR",focusCnpj:"11222333000181",encryptedFocusTokens:"fixture"},update:{provider:"FOCUS",enabled:true,environment:"SANDBOX",crt:"1",issuerState:"PR",focusCnpj:"11222333000181",encryptedFocusTokens:"fixture"}});
  const product=await tx.product.create({data:{arenaId:arena.id,name:`Mercadoria fiscal QA ${randomUUID()}`,priceCents:3000,fiscalProfile:profile}});
  const sale=await tx.sale.create({data:{arenaId:arena.id,code:randomUUID(),totalCents:3000,paymentMethod:"Dinheiro",items:{create:{productId:product.id,quantity:1,unitPriceCents:3000,totalCents:3000,fiscalProfile:profile}},payments:{create:{paymentMethod:"Dinheiro",amountCents:3000}}}});
  await tx.$executeRaw`SELECT set_config('app.arena_id',${arena.id},true)`;await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
  let posts=0,gets=0,cancels=0,remote=false,timeout=true,cancelFails=true;let lastReference="";
  const key="41261111222333000181"+"0".repeat(24);
  assert.equal(key.length,44);
  const exports:Record<string,any>={};
  const mocks:Record<string,unknown>={"server-only":{},"crypto":{randomUUID},"@/lib/arena-database":{arenaDatabase:(id:string)=>{assert.equal(id,arena.id);return {...tx,$transaction:async(fn:any)=>fn(tx)};}},"@/lib/payments/connection-secrets":{decryptConnectionSecrets:()=>({SANDBOX:"synthetic-token"})},"./focus-payload":{buildFocusNfce},"./focus-client":{FocusHttpError:FakeHttpError,focusDocumentUrl:(_:string,path:unknown)=>String(path??""),focusRequest:async(environment:string,token:string,path:string,method="GET",body?:any)=>{
   assert.equal(environment,"SANDBOX");assert.equal(token,"synthetic-token");
   if(method==="GET"){gets++;if(!remote)throw new FakeHttpError(404,"nao_encontrado");return{status:"autorizado",chave_nfe:key,cnpj_emitente:"11222333000181",ref:lastReference,numero:"1",serie:"1"};}
   if(method==="DELETE"){cancels++;assert.ok(body.justificativa.length>=15);if(cancelFails)return{status:"erro_autorizacao",mensagem_sefaz:"Cancelamento recusado"};return{status:"cancelado",mensagem_sefaz:"Cancelamento homologado"};}
   posts++;lastReference=new URL("https://synthetic.test"+path).searchParams.get("ref")!;assert.equal(body.items.length,1);remote=true;if(timeout)throw Error("timeout synthetic");return{status:"autorizado",chave_nfe:key};
  }}};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/fiscal/focus-issuance.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Error,Date,console,require:(name:string)=>mocks[name]??{}});
  await assert.rejects(exports.enqueueFocusNfce(tx,{arenaId:foreign.id,saleId:sale.id,documentType:"NFC_E"}));
  const document=await exports.enqueueFocusNfce(tx,{arenaId:arena.id,saleId:sale.id,documentType:"NFC_E"});
  assert.equal(document.status,"PENDING");assert.notEqual(document.accessKey,key);assert.equal(await tx.fiscalDocumentItem.count({where:{fiscalDocumentId:document.id}}),1);
  await tx.product.update({where:{id:product.id},data:{name:"Nome alterado depois da venda"}});
  await exports.dispatchFocusNfce(arena.id,document.id);
  assert.equal((await tx.fiscalDocument.findUniqueOrThrow({where:{id:document.id}})).status,"ERROR");assert.equal(posts,1);
  await exports.dispatchFocusNfce(arena.id,document.id);
  const authorized=await tx.fiscalDocument.findUniqueOrThrow({where:{id:document.id}});assert.equal(authorized.status,"AUTHORIZED");assert.equal(authorized.accessKey,key);assert.equal(posts,1);assert.equal(gets,2);
  await exports.dispatchFocusNfce(arena.id,document.id);assert.equal(gets,2);
  await exports.dispatchFocusNfce(arena.id,document.id,"Cancelamento de teste solicitado");const preserved=await tx.fiscalDocument.findUniqueOrThrow({where:{id:document.id}});assert.equal(preserved.status,"AUTHORIZED");assert.equal(preserved.accessKey,key);cancelFails=false;
  await exports.dispatchFocusNfce(arena.id,document.id,"Cancelamento de teste solicitado");assert.equal(cancels,2);assert.equal((await tx.fiscalDocument.findUniqueOrThrow({where:{id:document.id}})).status,"CANCELLED");
  const leased=await tx.fiscalDocument.create({data:{arenaId:arena.id,provider:"FOCUS",status:"PROCESSING",processingAt:new Date(),accessKey:randomUUID(),supplierDocument:"11222333000181"}});
  await exports.dispatchFocusNfce(arena.id,leased.id);assert.equal(gets,4);
  assert.equal((await tx.sale.findUniqueOrThrow({where:{id:sale.id}})).status,"PAID");
  throw rollback;
 },{timeout:30000}),e=>e===rollback); } finally {await p.$disconnect();}
});
