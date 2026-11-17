import { authenticateAgent,AgentAccessError } from "@/lib/agents/authenticate";
import { withArenaTransaction } from "@/lib/rls";
import { readBoundedJson,RequestBodyTooLargeError } from "@/lib/http/json-body";
import { batchSchema,performBatch } from "@/lib/agents/finance-batch";
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{"Cache-Control":"no-store"}});
const valid=(id:string)=>/^[a-zA-Z0-9_-]{8,80}$/.test(id);
function failure(e:unknown){return e instanceof AgentAccessError?json({error:e.message},e.status):json({error:"Não foi possível concluir o lote; consulte o recibo antes de repetir."},503);}
export async function GET(request:Request){try{
 const key=await authenticateAgent(request,"finance:read"),q=new URL(request.url).searchParams,id=q.get("requestId")??"";
 if(!valid(id)||[...q.keys()].some(k=>k!=="requestId"))return json({error:"Informe somente requestId."},400);
 const prior=await withArenaTransaction(key.arenaId,tx=>tx.auditEvent.findFirst({where:{arenaId:key.arenaId,actorId:key.id,entityId:`${key.id}:${id}`,action:"AGENT_FINANCE_BATCH"}}));
 const receipt=prior?(prior.details as {receipt:object}).receipt:{state:"not_found",requestId:id};return json({...receipt,source:{system:"arena",company:key.arenaId}});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const key=await authenticateAgent(request,"finance:write"),id=request.headers.get("idempotency-key")??"";
 if(!valid(id))return json({error:"Idempotency-Key inválida."},400);
 let input;try{input=await readBoundedJson(request,64*1024);}catch(e){return json({error:"JSON inválido ou excede limite."},e instanceof RequestBodyTooLargeError?413:400);}
 const parsed=batchSchema.safeParse(input);if(!parsed.success)return json({error:"Campos do lote inválidos."},400);
 const receipt=await withArenaTransaction(key.arenaId,tx=>performBatch(tx,key,id,parsed.data),{timeout:30000});return json({...receipt,source:{system:"arena",company:key.arenaId}});
}catch(e){return failure(e);}}
