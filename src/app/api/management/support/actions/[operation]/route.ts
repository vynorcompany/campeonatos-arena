import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireArenaAccess } from "@/lib/backend/services/management-session";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { supportOperations, supportInputSchema, type SupportOperation } from "@/lib/backend/contracts/support";
import { createSupportTicketAction, updateAgencyTicketAction, addSupportTicketMessageAction } from "@/lib/backend/services/support-actions";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: {params:Promise<{operation:string}>}) {
  const headers = {"Cache-Control":"private, no-store",Vary:"Cookie"};
  if (!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({error:"Origem não autorizada."},{status:403,headers});
  const raw = (await context.params).operation;
  if (!supportOperations.includes(raw as SupportOperation)) return NextResponse.json({error:"Operação inválida."},{status:404,headers});
  const operation = raw as SupportOperation;
  if (operation === "create") await requireArenaAccess();
  else {
    const auth = await requireAuth();
    if (!["SUPER_ADMIN","ADMIN","MANAGER"].includes(auth.systemRole)) return NextResponse.json({error:"Sem permissão para gerenciar chamados."},{status:403,headers});
  }
  let input;
  try { input = supportInputSchema(operation).parse(await readBoundedJson(request,128*1024)); }
  catch (error) { return NextResponse.json({error:"Dados do chamado inválidos."},{status:error instanceof RequestBodyTooLargeError?413:400,headers}); }
  const form = new FormData();
  for (const [key,value] of Object.entries(input)) form.set(key,value);
  try {
    if (operation === "create") await createSupportTicketAction(form);
    else if (operation === "update") await updateAgencyTicketAction(form);
    else await addSupportTicketMessageAction(form);
    return NextResponse.json({error:null},{headers});
  } catch { return NextResponse.json({error:"Não foi possível confirmar a alteração. Confira o chamado antes de tentar novamente."},{status:500,headers}); }
}
