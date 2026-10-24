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
  let read=false;const date=new Date();
  const tx={
    playerNotification:{findMany:async()=>[{id:"player-note",type:"GENERAL",title:"Aviso",message:"Mensagem",href:"",readAt:read?date:null,createdAt:date}]},
    portalAnnouncement:{findMany:async()=>[{id:"notice",title:"Arena",message:"Mensagem",createdAt:date}]},
    financialEntry:{findMany:async()=>[{id:"debt",description:"Mensalidade",amountCents:500,status:"OVERDUE",dueDate:new Date("2020-01-01"),createdAt:date,onlinePaymentUrl:"",settlements:[]}]},
    playerPortalNotificationRead:{findMany:async()=>read?[{notificationKey:"finance-debt"},{notificationKey:"arena-notice"},{notificationKey:"booking-delinquency"}]:[]},
    categoryMatch:{findMany:async()=>[]},
  };
  const service=moduleAt("src/lib/services/public-player-notifications.ts",{
    "server-only":{},"@/lib/prisma":{prisma:{arena:{findUnique:async()=>({id:"arena-a",onlineBookingOverdueBlockDays:1})}}},
    "@/lib/rls":{withArenaTransaction:async(_id:string,fn:(tx:unknown)=>unknown)=>fn(tx)},
    "@/lib/finance/settlements":{getOutstandingCents:(amount:number)=>amount},
    "@/lib/calendar/arena-wall-clock":{arenaToday:()=>date,instantToArenaWallClock:(value:Date)=>value},
    "@/lib/calendar/booking-delinquency":{getBookingDelinquency:async()=>({blocked:true})},
  });
  const before=await service.getAthletePortalNotifications("arena-a","player-a");assert.equal(before.filter((n:any)=>!n.isRead).length,4);
  read=true;const after=await service.getAthletePortalNotifications("arena-a","player-a");assert.equal(after.filter((n:any)=>!n.isRead).length,0);
  assert.equal(after.find((n:any)=>n.id==="finance-debt").persistent,true);
  assert.ok(after.some((n:any)=>n.id==="booking-delinquency"));
});

test("leitura em lote usa a arena e o atleta autenticados e informa falhas", async()=>{
  const {z}=await import("zod");let fail=false;const writes:any[]=[];const paths:string[]=[];
  const tx={playerNotification:{updateMany:async(q:unknown)=>{writes.push(q);if(fail)throw Error("db");}},playerPortalNotificationRead:{createMany:async(q:unknown)=>writes.push(q)}};
  const actions=moduleAt("src/lib/actions/public-player-notifications.ts",{
    zod:{z},"next/cache":{revalidatePath:(path:string)=>paths.push(path)},
    "@/lib/auth/player-session":{requirePublicPlayerAuth:async()=>({arenaId:"arena-a",playerId:"player-a"})},
    "@/lib/rls":{withArenaTransaction:async(id:string,fn:(tx:unknown)=>unknown)=>{assert.equal(id,"arena-a");return fn(tx);}},
  });
  const result=await actions.markAllPublicPlayerNotificationsReadAction("arena-a",[{id:"note",source:"PLAYER"},{id:"finance-debt",source:"FINANCE"},{id:"finance-debt",source:"FINANCE"}]);
  assert.equal(result.error,null);assert.equal(writes[0].where.playerId,"player-a");assert.equal(writes[0].where.player.arenaId,"arena-a");assert.equal(writes[1].data.length,1);assert.equal(writes[1].data[0].playerId,"player-a");assert.ok(paths.includes("/home"));
  fail=true;assert.match((await actions.markAllPublicPlayerNotificationsReadAction("arena-a",[{id:"note",source:"PLAYER"}])).error,/Não foi possível salvar/);
});
