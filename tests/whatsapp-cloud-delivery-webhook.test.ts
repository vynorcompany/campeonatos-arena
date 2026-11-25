import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import { cloudDeliveryWebhook, type DeliveryStatus } from "../src/lib/integrations/whatsapp-cloud/delivery-webhook";
const config={appSecret:"private-app-secret",verifyToken:"v".repeat(48),phoneNumberId:"phone-a",messagingAccountId:"account-a"};
const status={id:"wamid.private",status:"failed",timestamp:"1795630000",recipient_id:"5511999990000",errors:[{code:131047,title:"private error",error_data:{details:"OTP 123456"}}]};
const payload=()=>({object:"whatsapp_business_account",entry:[{id:"account-a",changes:[{field:"messages",value:{messaging_product:"whatsapp",metadata:{phone_number_id:"phone-a"},statuses:[status],messages:[{text:{body:"secret incoming text"}}]}}]}]});
function signed(raw:string,secret=config.appSecret,headers:Record<string,string>={}) {return new Request("https://example.test/webhook",{method:"POST",headers:{"x-hub-signature-256":"sha256="+createHmac("sha256",secret).update(raw).digest("hex"),...headers},body:raw});}
test("webhook challenge requires configured secret and correct subscription token",async()=>{
 const app=cloudDeliveryWebhook(config,()=>{});
 const url="https://example.test/webhook?hub.mode=subscribe&hub.challenge=123&hub.verify_token=";
 assert.equal(cloudDeliveryWebhook({},()=>{}).GET(new Request(url)).status,503);
 assert.equal(app.GET(new Request(url+"bad")).status,403);
 const response=app.GET(new Request(url+config.verifyToken));assert.equal(response.status,200);assert.equal(await response.text(),"123");assert.equal(response.headers.get("cache-control"),"no-store");
 assert.equal(app.GET(new Request(url.replace("subscribe","other")+config.verifyToken)).status,403);
});
test("signed delivery statuses are sanitized and replay has no account side effects",async()=>{
 const events:DeliveryStatus[]=[];const app=cloudDeliveryWebhook(config,event=>events.push(event));
 for(let i=0;i<2;i++) assert.equal((await app.POST(signed(JSON.stringify(payload())))).status,200);
 assert.deepEqual(events,[0,1].map(()=>({messageRef:createHash("sha256").update(status.id).digest("hex"),status:"failed",timestamp:status.timestamp,errorCodes:[131047]})));
 assert.doesNotMatch(JSON.stringify(events),/123456|5511999990000|private|secret/);
});
test("untrusted signatures, missing config and altered bytes never produce diagnostics",async()=>{
 let count=0;const app=cloudDeliveryWebhook(config,()=>{count++;});const raw=JSON.stringify(payload());
 assert.equal((await app.POST(new Request("https://example.test",{method:"POST",body:raw}))).status,401);
 assert.equal((await app.POST(signed(raw,"wrong"))).status,401);
 const original=signed(raw);assert.equal((await app.POST(new Request(original.url,{method:"POST",headers:original.headers,body:raw+" "}))).status,401);
 assert.equal((await cloudDeliveryWebhook({...config,appSecret:undefined},()=>{count++;}).POST(signed(raw))).status,503);
 assert.equal(count,0);
});
test("only configured messaging account and phone can produce allowed status events",async()=>{
 const events:DeliveryStatus[]=[];const app=cloudDeliveryWebhook(config,e=>events.push(e));
 for(const kind of ["account","phone","status","timestamp","field","object"]){
  const p=payload();
  if(kind==="account")p.entry[0].id="other";
  if(kind==="phone")p.entry[0].changes[0].value.metadata.phone_number_id="other";
  if(kind==="status")p.entry[0].changes[0].value.statuses=[{...status,status:"arbitrary text"}];
  if(kind==="timestamp")p.entry[0].changes[0].value.statuses=[{...status,timestamp:"secret"}];
  if(kind==="field")p.entry[0].changes[0].field="other";
  if(kind==="object")p.object="other";
  assert.equal((await app.POST(signed(JSON.stringify(p)))).status,200);
 }
 assert.equal(events.length,0);
});
test("payload limits apply to declared and streamed bytes; invalid JSON is rejected",async()=>{
 const app=cloudDeliveryWebhook(config,()=>{});
 assert.equal((await app.POST(signed("{}",undefined,{"content-length":String(3*1024*1024+1)}))).status,413);
 assert.equal((await app.POST(signed("x".repeat(3*1024*1024+1)))).status,413);
 assert.equal((await app.POST(signed("not json"))).status,400);
 assert.equal((await cloudDeliveryWebhook(config,()=>{throw new Error("log unavailable");}).POST(signed(JSON.stringify(payload())))).status,503);
});
