import test from "node:test";
import assert from "node:assert/strict";
import { enqueueComandaWhatsapp } from "../src/lib/comandas/whatsapp-outbox";
test("cada situação da comanda usa sua própria mensagem e apenas os valores do respectivo cliente",async()=>{
 const rows:any[]=[];
 const db:any={arena:{findUniqueOrThrow:async()=>({name:"Arena QA"})},player:{findFirst:async({where}:any)=>({id:where.id,name:where.id==="a"?"Ana":"Bruno",phone:"5511999990000"})},comandaWhatsappDelivery:{upsert:async({create}:any)=>{rows.push(create);return {...create,id:String(rows.length),status:"PENDING"};}}};
 const settings={whatsappPaidEnabled:true,whatsappUnpaidEnabled:true,whatsappMessage:"",whatsappPaidMessage:"{cliente} quitou {total} na {arena}",whatsappUnpaidMessage:"{cliente} tem {pendente} pendentes na comanda {comanda}"};
 await enqueueComandaWhatsapp(db,"arena",{id:"command",code:"C1"},settings,[{playerId:"a",amountCents:1000,outstandingCents:0},{playerId:"b",amountCents:2500,outstandingCents:1500}]);
 assert.equal(rows.length,2);assert.equal(rows[0].kind,"PAID");assert.match(rows[0].message,/Ana quitou R\$\s*10,00/);assert.doesNotMatch(rows[0].message,/Bruno|15,00/);
 assert.equal(rows[1].kind,"UNPAID");assert.match(rows[1].message,/Bruno tem R\$\s*15,00 pendentes/);assert.doesNotMatch(rows[1].message,/Ana|10,00/);
 rows.length=0;await enqueueComandaWhatsapp(db,"arena",{id:"command",code:"C1"},{...settings,whatsappPaidMessage:""},[{playerId:"a",amountCents:1000,outstandingCents:0}]);assert.match(rows[0].message,/quitada/);assert.doesNotMatch(rows[0].message,/pendentes/);
});
