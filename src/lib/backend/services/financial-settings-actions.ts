import { FinanceOperationError } from "@/lib/finance/action-error";
import "server-only";
import { parseDreGroup } from "@/lib/reports/dre";
import { fetchWithDeadline } from "@/lib/http/fetch-with-deadline";

import { requirePermission } from "@/lib/auth/guards";
import { calculateBankAccountBalanceCents, parseBankBalanceCents } from "@/lib/finance/bank-balance";
import { parseDate, parseMoneyToCents } from "@/lib/finance/inputs";
import { getCouponValues } from "@/lib/finance/coupons";
import { withArenaTransaction } from "@/lib/rls";
import { encryptConnectionSecrets } from "@/lib/payments/connection-secrets";

import { bankBalanceSchema, couponSchema, couponToggleSchema, deleteCouponSchema, deleteSupplierSchema, financialCategoryDeleteSchema, financialCategoryUpdateSchema, financialSettingSchema, fiscalSettingsSchema, onlinePaymentSettingsSchema, paymentConnectionSchema, productCategorySchema, supplierUpdateSchema, updateCouponSchema } from "@/lib/finance/action-schemas";

export async function createFinancialSettingAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = financialSettingSchema.safeParse({
    area: formData.get("area"), name: formData.get("name"), type: formData.get("type"), bankName: formData.get("bankName"), openingBalance: formData.get("openingBalance"), document: formData.get("document"), phone: formData.get("phone"), email: formData.get("email"), notes: formData.get("notes")
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  let openingBalanceCents = 0;
  if (parsed.data.area === "contas-bancarias") {
    try {
      openingBalanceCents = parseMoneyToCents(parsed.data.openingBalance || "0");
    } catch {
      return { error: "Informe um saldo inicial válido, por exemplo 0,00." };
    }
  }
  try {
    await withArenaTransaction(auth.arenaId, async (tx) => {
      if (parsed.data.area === "categorias-financeiras") await tx.financialCategory.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, type: parsed.data.type, dreGroup: parseDreGroup(formData.get("dreGroup")) } });
      if (parsed.data.area === "formas-pagamento") await tx.paymentMethodSetting.create({ data: { arenaId: auth.arenaId, name: parsed.data.name } });
      if (parsed.data.area === "contas-bancarias") await tx.bankAccount.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, bankName: parsed.data.bankName, openingBalanceCents } });
      if (parsed.data.area === "fornecedores") await tx.supplier.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, document: parsed.data.document, phone: parsed.data.phone, email: parsed.data.email, notes: parsed.data.notes } });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return { error: "Já existe uma conta, fornecedor ou categoria com este nome." };
    console.error("Falha ao criar configuração financeira", error);
    return { error: "Não foi possível criar este cadastro agora. Confirme os campos e tente novamente; se persistir, informe o nome da conta ao suporte." };
  }


}

export async function reconcileBankAccountBalanceAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = bankBalanceSchema.safeParse({ bankAccountId: formData.get("bankAccountId"), balance: formData.get("balance") });
  if (!parsed.success) return { error: "Selecione a conta bancária e informe o saldo que deseja conferir." };
  let expectedBalanceCents: number;
  try { expectedBalanceCents = parseBankBalanceCents(parsed.data.balance); } catch (error) { return { error: error instanceof Error ? error.message : "Informe um saldo válido." }; }

  try {
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BankAccount" WHERE id = ${parsed.data.bankAccountId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const account = await tx.bankAccount.findFirst({ where: { id: parsed.data.bankAccountId, arenaId: auth.arenaId }, select: { id: true, name: true, openingBalanceCents: true } });
    if (!account) throw new FinanceOperationError("Conta bancária não encontrada. Atualize a página e selecione a conta novamente.");
    const calculatedBalanceCents = await calculateBankAccountBalanceCents(tx, auth.arenaId, account.id, account.openingBalanceCents);
    const differenceCents = expectedBalanceCents - calculatedBalanceCents;
    if (!differenceCents) return;
    await tx.financialEntry.create({ data: {
      arenaId: auth.arenaId,
      bankAccountId: account.id,
      type: differenceCents > 0 ? "REVENUE" : "EXPENSE",
      category: "AJUSTE DE SALDO BANCÁRIO",
      description: `Balanço de saldo · ${account.name}`,
      amountCents: Math.abs(differenceCents),
      paymentMethod: "Ajuste de saldo",
      status: "PAID",
      paidAt: new Date(),
      notes: `Saldo conferido: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(expectedBalanceCents / 100)}.`
    } });
  });

  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Conta bancária não encontrada")) return { error: error.message };
    console.error("Falha ao conferir saldo bancário", error instanceof Error ? error.name : "Erro desconhecido");
    return { error: "Não foi possível conferir o saldo agora. Tente novamente. Se o problema persistir, contate o suporte informando a conta selecionada." };
  }



}

export async function createProductCategoryAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = productCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  try {
    await withArenaTransaction(auth.arenaId, async (tx) => {
      await tx.productCategory.create({ data: { arenaId: auth.arenaId, name: parsed.data.name } });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) throw new FinanceOperationError("Já existe uma categoria com este nome.");
    throw error;
  }


}

export async function createCouponAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    minimumAmount: formData.get("minimumAmount"),
    maxUses: formData.get("maxUses"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt")
  });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  if (parsed.data.discountType === "PERCENTAGE" && parsed.data.discountValue > 100) throw new FinanceOperationError("O desconto percentual não pode passar de 100%.");

  const startsAt = parsed.data.startsAt ? parseDate(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? parseDate(parsed.data.endsAt) : null;
  if ((parsed.data.startsAt && !startsAt) || (parsed.data.endsAt && !endsAt)) throw new FinanceOperationError("Informe datas válidas para o cupom.");
  if (startsAt && endsAt && endsAt < startsAt) throw new FinanceOperationError("A validade final deve ser posterior à inicial.");
  const maxUses = parsed.data.maxUses ? Number(parsed.data.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new FinanceOperationError("Informe um limite de uso válido.");

  try {
    await withArenaTransaction(auth.arenaId, async (tx) => {
      await tx.coupon.create({
        data: {
          arenaId: auth.arenaId,
          code: parsed.data.code.toUpperCase().replace(/\s+/g, ""),
          discountType: parsed.data.discountType,
          discountValue: parsed.data.discountValue,
          minimumAmountCents: parseMoneyToCents(parsed.data.minimumAmount),
          maxUses,
          startsAt,
          endsAt
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) throw new FinanceOperationError("Já existe um cupom com este código.");
    throw error;
  }


}

export async function updateCouponAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = updateCouponSchema.safeParse({ couponId: formData.get("couponId"), code: formData.get("code"), discountType: formData.get("discountType"), discountValue: formData.get("discountValue"), minimumAmount: formData.get("minimumAmount"), maxUses: formData.get("maxUses"), startsAt: formData.get("startsAt"), endsAt: formData.get("endsAt"), active: formData.get("active") });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const values = getCouponValues(parsed.data);
  try { await withArenaTransaction(auth.arenaId, (tx) => tx.coupon.updateMany({ where: { id: parsed.data.couponId, arenaId: auth.arenaId }, data: { ...values, active: parsed.data.active } })); } catch (error) { if (error instanceof Error && error.message.includes("Unique constraint")) throw new FinanceOperationError("Já existe um cupom com este código."); throw error; }

}

export async function deleteCouponAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage"); const parsed = deleteCouponSchema.safeParse({ couponId: formData.get("couponId") });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  await withArenaTransaction(auth.arenaId, (tx) => tx.coupon.deleteMany({ where: { id: parsed.data.couponId, arenaId: auth.arenaId } }));
}

export async function toggleCouponActiveAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = couponToggleSchema.safeParse({ couponId: formData.get("couponId"), active: formData.get("active") });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.coupon.updateMany({ where: { id: parsed.data.couponId, arenaId: auth.arenaId }, data: { active: parsed.data.active } }));
  if (!updated.count) throw new FinanceOperationError("Cupom não encontrado.");

}

export async function updateFinancialCategoryAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = financialCategoryUpdateSchema.safeParse({ categoryId: formData.get("categoryId"), name: formData.get("name"), type: formData.get("type") });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  try {
    const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.financialCategory.updateMany({ where: { id: parsed.data.categoryId, arenaId: auth.arenaId }, data: { name: parsed.data.name, type: parsed.data.type, dreGroup: parseDreGroup(formData.get("dreGroup")) } }));
    if (!updated.count) throw new FinanceOperationError("Categoria não encontrada.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) throw new FinanceOperationError("Já existe uma categoria com este nome.");
    throw error;
  }

}

export async function deleteFinancialCategoryAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = financialCategoryDeleteSchema.safeParse({ categoryId: formData.get("categoryId") });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const deleted = await withArenaTransaction(auth.arenaId, (tx) => tx.financialCategory.deleteMany({ where: { id: parsed.data.categoryId, arenaId: auth.arenaId } }));
  if (!deleted.count) throw new FinanceOperationError("Categoria não encontrada.");

}

export async function updateSupplierAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage"); const parsed = supplierUpdateSchema.safeParse({ supplierId: formData.get("supplierId"), name: formData.get("name"), document: formData.get("document"), phone: formData.get("phone"), email: formData.get("email"), notes: formData.get("notes"), active: formData.get("active") });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  try { const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.supplier.updateMany({ where: { id: parsed.data.supplierId, arenaId: auth.arenaId }, data: { name: parsed.data.name, document: parsed.data.document, phone: parsed.data.phone, email: parsed.data.email, notes: parsed.data.notes, active: parsed.data.active } })); if (!updated.count) throw new FinanceOperationError("Fornecedor não encontrado."); } catch (error) { if (error instanceof Error && error.message.includes("Unique constraint")) throw new FinanceOperationError("Já existe um fornecedor com este nome."); throw error; }

}

export async function deleteSupplierAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage"); const parsed = deleteSupplierSchema.safeParse({ supplierId: formData.get("supplierId") });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  try { await withArenaTransaction(auth.arenaId, (tx) => tx.supplier.deleteMany({ where: { id: parsed.data.supplierId, arenaId: auth.arenaId } })); } catch { throw new FinanceOperationError("Este fornecedor possui lançamentos vinculados. Inative-o em vez de excluir."); }

}

export async function updateFiscalSettingsAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = fiscalSettingsSchema.safeParse({
    provider: formData.get("provider"),
    crt: formData.has("crt") ? formData.get("crt") : undefined,
    issuerState: formData.has("issuerState") ? formData.get("issuerState") : undefined,
    environment: formData.get("environment"),
    series: formData.get("series"),
    nextNumber: formData.get("nextNumber"),
    notes: formData.get("notes")
  });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const enabled = parsed.data.provider !== "NONE";

  try { await withArenaTransaction(auth.arenaId, async (tx) => {
    const focus = parsed.data.provider === "FOCUS" ? await (await import("@/lib/fiscal/focus-settings")).focusSettingsData(tx, auth.arenaId, formData, parsed.data.provider, parsed.data.environment) : {};
    await tx.fiscalSettings.upsert({
      where: { arenaId: auth.arenaId },
      create: { arenaId: auth.arenaId, ...parsed.data, ...focus, enabled },
      update: { ...parsed.data, ...focus, enabled }
    });
  }); } catch (error) {
    if (error && typeof error === "object" && "fiscalValidation" in error && error instanceof Error) return { error: error.message };
    console.error("fiscal_settings_failed", { name: error instanceof Error ? error.name : "unknown" });
    return { error: "Não foi possível salvar a integração fiscal. Confira a configuração segura do servidor." };
  }


}

export async function updateOnlinePaymentSettingsAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = onlinePaymentSettingsSchema.safeParse({
    provider: formData.get("provider"),
    webhookUrl: formData.get("webhookUrl"),
    instructions: formData.get("instructions")
  });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const enabled = parsed.data.provider !== "NONE";

  await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.onlinePaymentSettings.upsert({
      where: { arenaId: auth.arenaId },
      create: {
        arenaId: auth.arenaId,
        ...parsed.data,
        enabled,
        pixEnabled: formData.get("pixEnabled") === "on",
        cardEnabled: formData.get("cardEnabled") === "on"
      },
      update: {
        ...parsed.data,
        enabled,
        pixEnabled: formData.get("pixEnabled") === "on",
        cardEnabled: formData.get("cardEnabled") === "on"
      }
    });
  });

}

export async function connectPaymentProviderAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = paymentConnectionSchema.safeParse({
    provider: formData.get("provider"), environment: formData.get("environment"), accessToken: (formData.get("accessToken") ?? ""),
    clientId: (formData.get("clientId") ?? ""), clientSecret: (formData.get("clientSecret") ?? ""), pixKey: (formData.get("pixKey") ?? ""),
    certificate: (formData.get("certificate") ?? ""), privateKey: (formData.get("privateKey") ?? ""), certificatePassword: (formData.get("certificatePassword") ?? "")
  });
  if (!parsed.success) throw new FinanceOperationError("Dados da conexão inválidos.");

  const data = parsed.data;
  if (data.provider === "ASAAS") {
    if (!data.accessToken) throw new FinanceOperationError("Informe a chave de API do Asaas.");
    const baseUrl = data.environment === "SANDBOX" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
    const response = await fetchWithDeadline(fetch, `${baseUrl}/myAccount`, { headers: { access_token: data.accessToken, "User-Agent": "ArenaPadelManager/1.0" }, cache: "no-store" });
    if (!response.ok) throw new FinanceOperationError("Não foi possível validar a chave do Asaas. Confira o ambiente e a chave informada.");
    const account = await response.json() as { name?: string; email?: string; id?: string };
    await withArenaTransaction(auth.arenaId, (tx) => tx.paymentConnection.upsert({ where: { arenaId_provider: { arenaId: auth.arenaId, provider: "ASAAS" } }, create: { arenaId: auth.arenaId, provider: "ASAAS", environment: data.environment, status: "CONNECTED", displayName: account.name || "Asaas", accountReference: account.id || account.email || "", encryptedSecrets: encryptConnectionSecrets({ accessToken: data.accessToken }), lastValidatedAt: new Date() }, update: { environment: data.environment, status: "CONNECTED", displayName: account.name || "Asaas", accountReference: account.id || account.email || "", encryptedSecrets: encryptConnectionSecrets({ accessToken: data.accessToken }), lastValidatedAt: new Date(), lastError: "" } }));
  } else {
    if (!data.clientId || !data.clientSecret || !data.pixKey || !data.certificate || !data.privateKey) throw new FinanceOperationError("Informe Client ID, Client Secret, chave PIX, certificado e chave privada do Sicoob.");
    await withArenaTransaction(auth.arenaId, (tx) => tx.paymentConnection.upsert({ where: { arenaId_provider: { arenaId: auth.arenaId, provider: "SICOOB" } }, create: { arenaId: auth.arenaId, provider: "SICOOB", environment: data.environment, status: "CONFIGURED", displayName: "Sicoob", accountReference: data.pixKey, encryptedSecrets: encryptConnectionSecrets({ clientId: data.clientId, clientSecret: data.clientSecret, pixKey: data.pixKey, certificate: data.certificate, privateKey: data.privateKey, certificatePassword: data.certificatePassword }) }, update: { environment: data.environment, status: "CONFIGURED", accountReference: data.pixKey, encryptedSecrets: encryptConnectionSecrets({ clientId: data.clientId, clientSecret: data.clientSecret, pixKey: data.pixKey, certificate: data.certificate, privateKey: data.privateKey, certificatePassword: data.certificatePassword }), lastError: "" } }));
  }

}
