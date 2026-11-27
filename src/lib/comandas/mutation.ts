import "server-only";
import { revalidatePath } from "next/cache";
import { comandaFormFields, remoteComandaMutation } from "@/lib/backend/comanda-client";
import type { ComandaOperation, ComandaOutcome } from "@/lib/backend/contracts/comanda";
export async function runComandaMutation(operation: ComandaOperation, form: FormData): Promise<ComandaOutcome> {
  let result: ComandaOutcome;
  try {
    const fields = comandaFormFields(operation, form);
    const origin = process.env.VX4_BACKEND_ORIGIN;
    result = origin ? await remoteComandaMutation(origin, operation, fields)
      : await (await import("@/lib/backend/services/comanda-mutations")).executeComandaMutation(operation, fields);
  } catch { return { error: "Não foi possível confirmar a operação. Confira a comanda antes de tentar novamente." }; }
  if (!result.error) {
    revalidatePath("/comandas");
    if (operation === "delete") revalidatePath("/auditoria");
    if (operation === "portal-open" || operation === "portal-close") revalidatePath("/home");
    if (operation === "portal-product" || operation === "portal-close") revalidatePath(`/classificacao/${String(form.get("arenaSlug") ?? "")}`);
    if (operation === "finish") {
      revalidatePath("/agenda"); revalidatePath("/home"); revalidatePath("/financeiro/lancamentos"); revalidatePath("/financeiro/contas-a-receber");
      revalidatePath("/torneios", "layout"); revalidatePath("/painel"); revalidatePath("/pdv/caixa"); revalidatePath("/relatorios/caixa");
    }
  }
  return result;
}
