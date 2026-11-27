import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { assistantCommandInputSchema,assistantOutcomeSchema } from "@/lib/backend/contracts/assistant";
import { runArenaAssistantCommandAction } from "@/lib/backend/services/assistant-actions";
import { parseArenaAssistantCommand } from "@/lib/assistant/commands";
import { assistantReadIntent } from "@/lib/assistant/read-data";
import { canPerformPermission } from "@/lib/permissions";
export const dynamic = "force-dynamic";
export async function POST(request:NextRequest) {
  const headers = {"Cache-Control":"private, no-store",Vary:"Cookie"};
  if (!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({error:"Origem não autorizada."},{status:403,headers});
  const auth = await requireArenaAccess();
  if (!["SUPER_ADMIN","ADMIN"].includes(auth.systemRole) && !["ADMIN","OWNER"].includes(auth.arenaRole??"")) return NextResponse.json({error:"Sem permissão para acessar o assistente."},{status:403,headers});
  let payload;
  try { payload=assistantCommandInputSchema.parse(await readBoundedJson(request,16*1024)); }
  catch(error) { return NextResponse.json({error:"Use uma solicitação de até 2.000 caracteres."},{status:error instanceof RequestBodyTooLargeError?413:400,headers}); }
  const command = parseArenaAssistantCommand(payload.input);
  if (command && !canPerformPermission("finance:receivable:create",auth.arenaRole,auth.systemRole,auth.editPermissions)) return NextResponse.json({error:"Sem permissão para criar contas a receber."},{status:403,headers});
  const intent = command ? null : assistantReadIntent(payload.input);
  if (intent && !canPerformPermission(intent.permission,auth.arenaRole,auth.systemRole,auth.viewPermissions)) return NextResponse.json({error:"Você não tem permissão para consultar este módulo."},{status:403,headers});
  try { return NextResponse.json(assistantOutcomeSchema.parse(await runArenaAssistantCommandAction(payload.input)),{headers}); }
  catch { return NextResponse.json({error:"Não foi possível confirmar a solicitação. Confira o histórico e os lançamentos antes de tentar novamente."},{status:500,headers}); }
}
