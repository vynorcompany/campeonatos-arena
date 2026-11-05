import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { encryptConnectionSecrets, decryptConnectionSecrets } from "@/lib/payments/connection-secrets";
import { validFiscalCnpj } from "./focus-payload";
export async function focusSettingsData(tx: Prisma.TransactionClient, arenaId: string, form: FormData, provider: string, environment: string) {
  if (provider !== "FOCUS") return {};
  const cnpj = String(form.get("focusCnpj") ?? "").replace(/\D/g, "");
  if (!validFiscalCnpj(cnpj)) throw new Error("Informe o CNPJ válido cadastrado na Focus.");
  const arena = await tx.arena.findUniqueOrThrow({ where: { id: arenaId }, select: { cnpj: true } });
  if (arena.cnpj.replace(/\D/g, "") !== cnpj) throw new Error("O CNPJ emitente deve ser o mesmo cadastrado nesta arena, e não o CNPJ da fornecedora do sistema.");
  const current = await tx.fiscalSettings.findUnique({ where: { arenaId } });
  const tokens = current?.focusCnpj === cnpj && current.encryptedFocusTokens ? decryptConnectionSecrets(current.encryptedFocusTokens) : {};
  for (const [key,field] of [["SANDBOX","focusSandboxToken"],["PRODUCTION","focusProductionToken"]]) {
    const value = String(form.get(field) ?? "").trim();
    if (value) tokens[key] = z.string().min(10,"Token Focus inválido.").max(500).regex(/^[A-Za-z0-9_-]+$/,"Token Focus inválido.").parse(value);
  }
  if (!tokens[environment]) throw new Error("Informe o token da Focus para o ambiente selecionado. Tokens são diferentes em homologação e produção.");
  if (environment === "PRODUCTION" && form.get("confirmProduction") !== "on") throw new Error("Confirme a emissão de notas com validade fiscal em produção.");
  return { focusCnpj: cnpj, encryptedFocusTokens: encryptConnectionSecrets(tokens) };
}
