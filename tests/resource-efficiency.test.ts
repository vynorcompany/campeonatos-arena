import assert from "node:assert/strict";
import test from "node:test";
import { createSharedPolling } from "../src/lib/client-polling";
import { createShortSnapshotCache } from "../src/lib/short-snapshot-cache";
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
function polling() {
  let visible = true, requests = 0;
  const timers: { callback: () => void; delay: number; cancelled?: boolean }[] = [];
  const store = createSharedPolling({ visible: () => visible, fetch: async () => { requests++; return { version: "same", unreadCount: 2 }; }, schedule: (callback, delay) => { const timer = {callback, delay}; timers.push(timer); return timer; }, cancel: timer => { (timer as any).cancelled = true; } });
  return {store,timers,get requests(){return requests},hide:()=>visible=false,show:()=>visible=true};
}
test("sidebar and inbox share one request and idle polling slows to a bounded interval", async () => {
  const f=polling(); const badge:any[]=[]; const inbox:any[]=[];
  const offA=f.store.subscribe(value=>badge.push(value),10000),offB=f.store.subscribe(value=>inbox.push(value),3000);
  await flush(); assert.equal(f.requests,1); assert.equal(badge.length,1); assert.equal(inbox.length,1); assert.equal(f.timers.at(-1)?.delay,3000);
  f.timers.at(-1)!.callback(); await flush(); assert.equal(f.timers.at(-1)?.delay,6000);
  for(let i=0;i<4;i++){f.timers.at(-1)!.callback();await flush();}assert.equal(f.timers.at(-1)?.delay,24000);
  offA();offB();assert.equal(f.timers.at(-1)?.cancelled,true);
});
test("hidden tabs issue no requests and visibility resumes immediately", async () => {
  const f=polling();const off=f.store.subscribe(()=>{},3000);await flush();f.hide();f.timers.at(-1)!.callback();await flush();assert.equal(f.requests,1);
  f.show();f.store.wake();await flush();assert.equal(f.requests,2);off();
});
test("unmount aborts in-flight work and old responses cannot reach a new subscriber", async () => {
  let finish:(value:{id:number})=>void=()=>{};let signal:AbortSignal|undefined;const results:number[]=[];
  const store=createSharedPolling({visible:()=>true,fetch:async s=>{signal=s;return new Promise<{id:number}>(r=>finish=r)},schedule:()=>0,cancel:()=>{}});
  const off=store.subscribe(value=>results.push(value.id),3000);off();assert.equal(signal?.aborted,true);finish({id:1});await flush();assert.deepEqual(results,[]);
});
test("short snapshots deduplicate concurrent loads, isolate tenants and expire", async () => {
  let now=0, loads=0;const cache=createShortSnapshotCache(1000,2,()=>now);const load=async()=>({version:++loads});
  const [a,b]=await Promise.all([cache("arena-a",load),cache("arena-a",load)]);assert.equal(loads,1);assert.equal(a.body,b.body);
  await cache("arena-b",load);assert.equal(loads,2);now=1001;const fresh=await cache("arena-a",load);assert.equal(loads,3);assert.notEqual(a.etag,fresh.etag);
});
test("snapshot capacity is bounded and failed requests are never retained", async () => {
  const cache=createShortSnapshotCache(1000,1);let loads=0;const load=async()=>++loads;
  await cache("a",load);await cache("b",load);await cache("a",load);assert.equal(loads,3);
  await assert.rejects(cache("failure",async()=>{throw Error("offline")}));assert.equal((await cache("failure",async()=>"restored")).body,'"restored"');
});
