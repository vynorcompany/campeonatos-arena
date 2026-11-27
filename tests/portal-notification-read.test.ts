import { arenaToday } from "../src/lib/calendar/arena-wall-clock";
import { getPortalDueUrgency } from "../src/lib/portal/financial-status";
import { portalCheckoutPolicy } from "../src/lib/payments/portal-checkout-policy";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function moduleAt(path: string, mocks: Record<string, unknown>) {
  const exports: Record<string, (...args: unknown[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Intl,Set,require:(key:string)=>{if(!(key in mocks))throw Error(key);return mocks[key];}});
  return exports;
}

test("ler notificações financeiras persiste a leitura sem eliminar a pendência", async()=>{
  let read=false;const date=new Date();let today=date;let dueDate:Date|null=new Date("2020-01-01");let paymentSettings:Parameters<typeof portalCheckoutPolicy>[0]=null;let paymentUrl="";
  const tx={arenaOperationalSettings:{findUnique:async()=>paymentSettings},
    playerNotification:{findMany:async()=>[{id:"player-note",type:"GENERAL",title:"Aviso",message:"Mensagem",href:"",readAt:read?date:null,createdAt:date}]},
    portalAnnouncement:{findMany:async()=>[{id:"notice",title:"Arena",message:"Mensagem",createdAt:date}]},
    financialEntry:{findMany:async()=>[{id:"debt",description:"Mensalidade",amountCents:500,status:"OVERDUE",dueDate,createdAt:date,onlinePaymentUrl:paymentUrl,settlements:[]}]},
    playerPortalNotificationRead:{findMany:async()=>read?[{notificationKey:"finance-debt"},{notificationKey:"arena-notice"},{notificationKey:"booking-delinquency"}]:[]},
    categoryMatch:{findMany:async()=>[]},
  };
  const service=moduleAt("src/lib/backend/services/portal-notifications.ts",{
    "@/lib/portal/financial-status": {getPortalDueUrgency},
    "@/lib/academy/lesson-credit-portal": {playerLessonCredits:async()=>null}, "server-only":{},"@/lib/prisma":{prisma:{arena:{findUnique:async()=>({id:"arena-a",onlineBookingOverdueBlockDays:1})}}},
    "@/lib/payments/portal-checkout-policy":{portalCheckoutPolicy},"@/lib/rls":{withArenaTransaction:async(_id:string,fn:(tx:unknown)=>unknown)=>fn(tx)},
    "@/lib/finance/settlements":{getOutstandingCents:(amount:number)=>amount},
    "@/lib/calendar/arena-wall-clock":{arenaToday:()=>today,instantToArenaWallClock:(value:Date)=>value},
    "@/lib/calendar/booking-delinquency":{getBookingDelinquency:async()=>({blocked:true})},
  });
  const before=await service.getAthletePortalNotifications("arena-a","player-a");assert.equal(before.filter((n:any)=>!n.isRead).length,4);
  assert.equal(before.find((n:any)=>n.id==="arena-notice").href,"/home?arena=arena-a&section=announcements#aviso-notice");
  read=true;const after=await service.getAthletePortalNotifications("arena-a","player-a");assert.equal(after.filter((n:any)=>!n.isRead).length,0);
  assert.equal(after.find((n:any)=>n.id==="arena-notice").href,before.find((n:any)=>n.id==="arena-notice").href);
  assert.equal(after.find((n:any)=>n.id==="finance-debt").persistent,true);
  assert.ok(after.some((n:any)=>n.id==="booking-delinquency"));
  paymentSettings={portalConsumptionEnabled:false,portalPaymentsConfigured:true,portalPaymentEnabled:true,portalPixEnabled:true,portalCreditCardEnabled:false,checkoutExpiryMinutes:0};
  const hidden=await service.getAthletePortalNotifications("arena-a","player-a");
  assert.equal(hidden.some((n:any)=>n.id==="finance-debt"),false);assert.doesNotMatch(JSON.stringify(hidden),/R\$|Pagamento pendente/);
  assert.match(hidden.find((n:any)=>n.id==="booking-delinquency").href,/cancelamento/);
  paymentSettings={...paymentSettings,portalConsumptionEnabled:true,portalPaymentEnabled:false};paymentUrl="https://checkout.private.example/pay";
  const readonly=await service.getAthletePortalNotifications("arena-a","player-a");
  assert.match(readonly.find((n:any)=>n.id==="finance-debt").href,/section=finance/);assert.doesNotMatch(JSON.stringify(readonly),/checkout\.private/);
  // The server may already say OVERDUE; the arena calendar date remains authoritative.
  dueDate=new Date(2026,10,18,0,0);
  today=arenaToday(new Date("2026-11-19T02:59:59Z"));
  const dueToday=await service.getAthletePortalNotifications("arena-a","player-a");
  assert.equal(dueToday.find((n:any)=>n.id==="finance-debt").title,"Pagamento em aberto");
  assert.equal(dueToday.find((n:any)=>n.id==="finance-debt").persistent,false);
  today=arenaToday(new Date("2026-11-19T03:00:00Z"));
  const nextDay=await service.getAthletePortalNotifications("arena-a","player-a");
  assert.equal(nextDay.find((n:any)=>n.id==="finance-debt").title,"Pagamento em atraso");
  assert.equal(nextDay.find((n:any)=>n.id==="finance-debt").persistent,true);
  dueDate=null;
  const withoutDue=await service.getAthletePortalNotifications("arena-a","player-a");
  assert.equal(withoutDue.find((n:any)=>n.id==="finance-debt").title,"Pagamento em aberto");


});

test("leitura em lote usa a arena e o atleta autenticados e informa falhas", async()=>{
  const {z}=await import("zod");let fail=false;const writes:any[]=[];
  const tx={playerNotification:{updateMany:async(q:unknown)=>{writes.push(q);if(fail)throw Error("db");}},playerPortalNotificationRead:{createMany:async(q:unknown)=>writes.push(q)}};
  const actions=moduleAt("src/lib/backend/services/public-player-notification-read.ts",{
    "server-only":{}, zod:{z},
    "@/lib/backend/services/player-session":{requirePublicPlayerAuth:async()=>({arenaId:"arena-a",playerId:"player-a"})},
    "@/lib/payments/portal-checkout-policy":{portalCheckoutPolicy},"@/lib/rls":{withArenaTransaction:async(id:string,fn:(tx:unknown)=>unknown)=>{assert.equal(id,"arena-a");return fn(tx);}},
  });
  const result=await actions.markAllPublicPlayerNotificationsReadAction("arena-a",[{id:"note",source:"PLAYER"},{id:"finance-debt",source:"FINANCE"},{id:"finance-debt",source:"FINANCE"}]);
  assert.equal(result.error,null);assert.equal(writes[0].where.playerId,"player-a");assert.equal(writes[0].where.player.arenaId,"arena-a");assert.equal(writes[1].data.length,1);assert.equal(writes[1].data[0].playerId,"player-a");
  fail=true;assert.match((await actions.markAllPublicPlayerNotificationsReadAction("arena-a",[{id:"note",source:"PLAYER"}])).error,/Não foi possível salvar/);
});
