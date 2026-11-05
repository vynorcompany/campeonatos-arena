import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { encryptConnectionSecrets, decryptConnectionSecrets } from "@/lib/payments/connection-secrets";
import { validFiscalCnpj, FocusFiscalValidationError } from "./focus-payload";
export async function focusSettingsData(tx: Prisma.TransactionClient, arenaId: string, form: FormData, provider: string, environment: string) {
  if (provider !== "FOCUS") return {};
  const cnpjInput = String(form.get("focusCnpj") ?? "");
  if (/[A-Za-z]/.test(cnpjInput)) throw new FocusFiscalValidationError("Esta integração inicial atende CNPJ numérico. CNPJ alfanumérico exige atualização específica antes de emitir.");
  const cnpj = cnpjInput.replace(/\D/g, "");
  if (!validFiscalCnpj(cnpj)) throw new FocusFiscalValidationError("Informe o CNPJ válido cadastrado na Focus.");
  const arena = await tx.arena.findUniqueOrThrow({ where: { id: arenaId }, select: { cnpj: true } });
  if (arena.cnpj.replace(/\D/g, "") !== cnpj) throw new FocusFiscalValidationError("O CNPJ emitente deve ser o mesmo cadastrado nesta arena, e não o CNPJ da fornecedora do sistema.");
  const current = await tx.fiscalSettings.findUnique({ where: { arenaId } });
  const tokens = current?.focusCnpj === cnpj && current.encryptedFocusTokens ? decryptConnectionSecrets(current.encryptedFocusTokens) : {};
  for (const [key,field] of [["SANDBOX","focusSandboxToken"],["PRODUCTION","focusProductionToken"]]) {
    const value = String(form.get(field) ?? "").trim();
    if (value) {
      const parsed = z.string().min(10).max(500).regex(/^[A-Za-z0-9_-]+$/).safeParse(value);
      if (!parsed.success) throw new FocusFiscalValidationError("Token Focus inválido.");
      tokens[key] = parsed.data;
    }
  }
  if (!tokens[environment]) throw new FocusFiscalValidationError("Informe o token da Focus para o ambiente selecionado. Tokens são diferentes em homologação e produção.");
  if (environment === "PRODUCTION" && form.get("confirmProduction") !== "on") throw new FocusFiscalValidationError("Confirme a emissão de notas com validade fiscal em produção.");
  return { focusCnpj: cnpj, encryptedFocusTokens: encryptConnectionSecrets(tokens) };
}
