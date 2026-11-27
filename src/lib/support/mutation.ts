import "server-only";
import { revalidatePath } from "next/cache";
import { remoteSupportMutation } from "@/lib/backend/support-client";
import type { SupportOperation } from "@/lib/backend/contracts/support";
export async function runSupportMutation(operation:SupportOperation,form:FormData) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (origin) await remoteSupportMutation(origin,operation,form);
  else {
    const core = await import("@/lib/backend/services/support-actions");
    if (operation === "create") await core.createSupportTicketAction(form);
    else if (operation === "update") await core.updateAgencyTicketAction(form);
    else await core.addSupportTicketMessageAction(form);
  }
  revalidatePath("/suporte");
  revalidatePath("/agencia");
}
