import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";

function fixture() {
  let now = Date.now();
  class Clock extends Date { static now() { return now; } }
  let effect!: () => () => void;
  const timers = new Map<number, () => Promise<void>>();
  const windowEvents = new EventTarget(), documentEvents = new EventTarget();
  const storage = new Map([["arena-comanda-alerts", "on"]]);
  const calls: { url: string; options: RequestInit }[] = [];
  let rows: unknown[] = [], beeps = 0, resumeCalls = 0, blockGeneral = false;
  const pending: (() => void)[] = [];
  const context = { state: "running", currentTime: 0, destination: {}, resume: async () => { resumeCalls++; context.state = "running"; }, close: async () => {}, createOscillator: () => ({ connect() {}, frequency: {setValueAtTime(){}}, start(){beeps++;}, stop(){} }), createGain: () => ({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}) };
  const document = Object.assign(documentEvents,{visibilityState:"visible"});
  const exports: Record<string, (...args: any[]) => any> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/components/comandas/request-alerts.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
    exports, Date: Clock, Event, AbortController,
    CustomEvent: class extends Event {detail:unknown;constructor(name:string,init:any){super(name);this.detail=init.detail;}},
    AudioContext: function(){return context;}, navigator:{onLine:true}, document,
    localStorage:{getItem:(key:string)=>storage.get(key),setItem:(key:string,value:string)=>storage.set(key,value)},
    clearInterval(){},window:Object.assign(windowEvents,{setInterval:(fn:()=>Promise<void>,ms:number)=>{timers.set(ms,fn);return ms;}}),
    fetch:async(url:string,options:RequestInit)=>{calls.push({url,options});if(blockGeneral&&!url.includes('scope='))await new Promise<void>(resolve=>pending.push(resolve));return {status:200,ok:true,headers:new Headers({ETag:JSON.stringify(rows)}),json:async()=>({notifications:rows,comandaRequestCount:rows.length})};},
    require:(name:string)=>{
      if(name==='react')return{useEffect:(fn:()=>()=>void)=>{effect=fn;},useRef:(value:unknown)=>({current:value}),useState:(value:unknown)=>[value,()=>{}]};
      if(name==='react/jsx-runtime')return{jsx:()=>null,jsxs:()=>null};
      if(name==='react-dom')return{createPortal:()=>null};
      if(name==='next/link')return{default:()=>null};
      throw Error(name);
    },
  });
  exports.ComandaRequestAlerts({});
  return {advance:(ms:number)=>{now+=ms;},timers,storage,calls,context,document,window:windowEvents,pending,start:()=>effect(),setRows:(value:unknown[])=>{rows=value;},blockGeneral:()=>{blockGeneral=true;},beeps:()=>beeps,resumes:()=>resumeCalls};
}
const settle = async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const row=()=>({id:'new-order',title:'Novo pedido',message:'Cliente solicitou um item',href:'/comandas',createdAt:new Date(Date.now()+100).toISOString()});

test("sound detects a request on the two-second channel while general notifications are still waiting",async()=>{
 const f=fixture();f.blockGeneral();const stop=f.start();f.window.dispatchEvent(new Event('focus'));await settle();
 f.setRows([row()]);await f.timers.get(2000)!();await settle();assert.equal(f.beeps(),1);
 assert.equal(f.calls.filter(c=>!c.url.includes('scope=')).length,1);
 assert.ok(f.calls.at(-1)!.options.headers); // independent conditional requests retain ETags
 await f.timers.get(2000)!();assert.equal(f.beeps(),1);
 f.pending[0]();await settle();assert.equal(f.beeps(),1);stop();
});
test("disabling sound avoids fast network polling; focusing checks immediately and resumes suspended audio",async()=>{
 const f=fixture();const stop=f.start();await settle();f.storage.delete('arena-comanda-alerts');const before=f.calls.length;
 await f.timers.get(2000)!();assert.equal(f.calls.length,before);
 f.storage.set('arena-comanda-alerts','on');f.context.state='suspended';f.setRows([row()]);f.window.dispatchEvent(new Event('focus'));await settle();
 assert.equal(f.beeps(),1);assert.ok(f.resumes()>0);
 stop();assert.ok(f.calls.every(c=>c.options.signal?.aborted));f.setRows([{...row(),id:'after-unmount'}]);f.window.dispatchEvent(new Event('focus'));await settle();assert.equal(f.beeps(),1);
});

test("a browser that unlocks audio much later does not replay the old request",async()=>{
 const f=fixture();const stop=f.start();await settle();
 const releases:(()=>void)[]=[];f.context.state='suspended';f.context.resume=()=>new Promise<void>(resolve=>releases.push(()=>{f.context.state='running';resolve();}));
 f.setRows([row()]);f.window.dispatchEvent(new Event('focus'));await settle();assert.equal(f.beeps(),0);
 f.advance(3000);for(const release of releases)release();await settle();assert.equal(f.beeps(),0);stop();
});
