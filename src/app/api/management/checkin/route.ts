import {NextRequest,NextResponse} from "next/server";
import {getArenaAccessDecision} from "@/lib/backend/services/management-session";
import {canPerformPermission,canViewModule} from "@/lib/permissions";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {checkinInputSchema,checkinSettingsSchema} from "@/lib/backend/contracts/checkin";
import {executeCheckinMutation} from "@/lib/backend/services/checkin-mutations";
import {arenaDatabase} from "@/lib/arena-database";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
async function access(requireView=true){const d=await getArenaAccessDecision(),a=d.auth;if(!a)return null;return canPerformPermission("calendar:settings:manage",a.arenaRole,a.systemRole,a.editPermissions)&&(!requireView||canViewModule("calendar",a.arenaRole,a.systemRole,a.viewPermissions))?a:null;}
export async function GET(request:NextRequest){const auth=await access();if(!auth)return fail("Sem permissão para consultar o check-in.",403);if(request.nextUrl.searchParams.size)return fail("Filtros inválidos.",400);try{const arena=await arenaDatabase(auth.arenaId).arena.findUniqueOrThrow({where:{id:auth.arenaId},select:{slug:true,checkinEnabled:true,checkinMode:true,checkinToken:true,operationalSettings:{select:{lessonCheckinBlockOverdue:true}}}});const{operationalSettings,...data}=arena;return NextResponse.json(checkinSettingsSchema.parse({...data,blockOverdueLessons:operationalSettings?.lessonCheckinBlockOverdue??false}),{headers});}catch{return fail("Não foi possível consultar o check-in.",503);}}
export async function POST(request:NextRequest){if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);if(!await access(false))return fail("Sem permissão para configurar o check-in.",403);let input;try{input=checkinInputSchema("configure").parse(await readBoundedJson(request,8192));}catch(error){return fail("Revise os dados do check-in.",error instanceof RequestBodyTooLargeError?413:400);}try{return NextResponse.json(await executeCheckinMutation("configure",input.fields),{headers});}catch{return fail("Não foi possível confirmar a configuração. Confira os dados antes de tentar novamente.",400);}}
