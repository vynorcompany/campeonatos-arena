"use server";
import { requireArenaAccess } from "@/lib/auth/session";
import { canPerformPermission } from "@/lib/permissions";
import { readPayslipFile } from "@/lib/finance/payslip-file";
export async function previewPayslipAction(form: FormData) {
  const auth = await requireArenaAccess();
  if (!canPerformPermission("finance:payable:create", auth.arenaRole, auth.systemRole, auth.editPermissions)) throw new Error("Sem permissão para importar folha.");
  const file = form.get("file");
  if (!(file instanceof File)) return { error: "Envie um holerite PDF ou TXT." };
  try { return { draft: await readPayslipFile(file) }; }
  catch (error) {
    if (error instanceof Error && /holerite|totais|texto|proventos|divergentes|Formato|MB|paginas/i.test(error.message)) return { error: error.message };
    return { error: "Não foi possível ler o holerite. Confira se o PDF tem texto selecionável e não exige senha." };
  }
}
