import { NextRequest,NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission } from "@/lib/permissions";
import { resolveReportWorkspace } from "@/lib/backend/services/report-workspace";
import { reportQuerySchema } from "@/lib/backend/contracts/report-workspace";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const auth=await requireArenaAccess(),headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
 if(!canPerformPermission("finance:reports:view",auth.arenaRole,auth.systemRole,auth.viewPermissions))return NextResponse.json({error:"Sem permissão para consultar relatórios."},{status:403,headers});
 const search=request.nextUrl.searchParams;
 if([...search.keys()].some(key=>key!=="quadra"&&search.getAll(key).length!==1))return NextResponse.json({error:"Parâmetros inválidos."},{status:400,headers});
 const input:Record<string,unknown>=Object.fromEntries(search);if(search.has("quadra"))input.quadra=search.getAll("quadra");
 const query=reportQuerySchema.safeParse(input);if(!query.success)return NextResponse.json({error:"Parâmetros inválidos."},{status:400,headers});
 try{return NextResponse.json(await resolveReportWorkspace(query.data),{headers});}catch{return NextResponse.json({error:"Não foi possível consultar o relatório."},{status:503,headers});}
}
