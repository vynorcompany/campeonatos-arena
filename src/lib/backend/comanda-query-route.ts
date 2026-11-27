import "server-only";
import {NextRequest,NextResponse} from "next/server";
import {getArenaAccessDecision} from "./services/management-session";
import {canViewModule} from "@/lib/permissions";
import {comandaListQuerySchema,comandaDocumentQuerySchema} from "./contracts/comanda-queries";
import {resolveComandaList,resolveComandaDocument} from "./services/comanda-queries";
export async function handleComandaQuery(request:NextRequest,document:boolean){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
 const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 const decision=await getArenaAccessDecision();const auth=decision.auth;
 if(!auth)return fail("Acesso à arena indisponível.",decision.redirectTo==="/login"?401:403);
 if(!canViewModule("pos",auth.arenaRole,auth.systemRole,auth.viewPermissions))return fail("Sem permissão para consultar comandas.",403);
 const params=request.nextUrl.searchParams;
 if([...params.keys()].some(key=>params.getAll(key).length!==1))return fail("Filtros inválidos.",400);
 const input=(document?comandaDocumentQuerySchema:comandaListQuerySchema).safeParse(Object.fromEntries(params));
 if(!input.success)return fail("Filtros inválidos.",400);
 try{
  if(document){const query=comandaDocumentQuerySchema.parse(input.data);const data=await resolveComandaDocument(auth.arenaId,query.id,query.view);return data?NextResponse.json(data,{headers}):fail("Comanda não encontrada.",404);}
  return NextResponse.json(await resolveComandaList(auth.arenaId,comandaListQuerySchema.parse(input.data)),{headers});
 }catch{return fail("Não foi possível consultar as comandas. Tente novamente.",503);}
}
