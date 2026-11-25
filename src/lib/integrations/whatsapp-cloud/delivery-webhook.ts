import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type DeliveryStatus = { messageRef: string; status: string; timestamp: string; errorCodes: number[] };
type Config = { appSecret?: string; verifyToken?: string; phoneNumberId?: string; messagingAccountId?: string };
const limit = 3 * 1024 * 1024;
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function equal(a: string, b: string) { const left=Buffer.from(a), right=Buffer.from(b); return left.length===right.length && timingSafeEqual(left,right); }
function reply(status: number, body = "") { return new Response(body,{status,headers:{"Cache-Control":"no-store","Content-Type":"text/plain; charset=utf-8"}}); }

/** No incoming text, recipient, OTP, credential or provider error text enters diagnostics. */
export function cloudDeliveryWebhook(config: Config, report: (event: DeliveryStatus) => void) {
  return {
    GET(request: Request) {
      if (!config.verifyToken || config.verifyToken.length < 32) return reply(503);
      const query=new URL(request.url).searchParams;
      const token=query.get("hub.verify_token") ?? "";
      const challenge=query.get("hub.challenge") ?? "";
      if (query.get("hub.mode")!=="subscribe" || token.length>512 || !equal(token,config.verifyToken) || !/^\d{1,100}$/.test(challenge)) return reply(403);
      return reply(200,challenge);
    },
    async POST(request: Request) {
      if (!config.appSecret || !config.phoneNumberId || !config.messagingAccountId) return reply(503);
      const signature=request.headers.get("x-hub-signature-256") ?? "";
      if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return reply(401);
      if (Number(request.headers.get("content-length"))>limit) return reply(413);
      const chunks: Uint8Array[]=[];
      let size=0;
      if (!request.body) return reply(400);
      const reader=request.body.getReader();
      try {
        while (true) {
          const {done,value}=await reader.read(); if(done) break;
          size+=value.byteLength;
          if(size>limit) { void reader.cancel().catch(()=>{}); return reply(413); }
          chunks.push(value);
        }
      } catch { return reply(400); }
      finally { reader.releaseLock(); }
      const raw=Buffer.concat(chunks,size);
      const expected="sha256="+createHmac("sha256",config.appSecret).update(raw).digest("hex");
      if(!equal(signature,expected)) return reply(401);
      let payload: Record<string,unknown>;
      try { payload=record(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw))); } catch { return reply(400); }
      if(payload.object!=="whatsapp_business_account") return reply(200);
      const events: DeliveryStatus[]=[];
      for(const item of Array.isArray(payload.entry) ? payload.entry : []) {
        const entry=record(item); if(entry.id!==config.messagingAccountId) continue;
        for(const item of Array.isArray(entry.changes) ? entry.changes : []) {
          const change=record(item), value=record(change.value);
          if(change.field!=="messages" || value.messaging_product!=="whatsapp" || record(value.metadata).phone_number_id!==config.phoneNumberId) continue;
          for(const item of Array.isArray(value.statuses) ? value.statuses : []) {
            const event=record(item);
            if(typeof event.id!=="string" || !event.id || event.id.length>512 || !["sent","delivered","read","failed"].includes(String(event.status)) || !/^\d{1,16}$/.test(String(event.timestamp))) continue;
            const errorCodes=(Array.isArray(event.errors) ? event.errors : []).map(error=>record(error).code).filter((code): code is number=>typeof code==="number" && Number.isSafeInteger(code) && code>=0).slice(0,10);
            events.push({messageRef:createHash("sha256").update(event.id).digest("hex"),status:String(event.status),timestamp:String(event.timestamp),errorCodes});
            if(events.length>1000) return reply(413);
          }
        }
      }
      // Repeated Meta events only repeat diagnostics; they never change accounts or passwords.
      try { for(const event of events) report(event); } catch { return reply(503); }
      return reply(200,"EVENT_RECEIVED");
    },
  };
}
