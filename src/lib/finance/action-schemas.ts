import { z } from "zod";

const optionalText = z.preprocess((value) => value ?? "", z.string().trim().default(""));

export const planSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do plano."),
  monthlyPrice: z.string().trim().min(1, "Informe o valor mensal."),
  classesPerMonth: z.coerce.number().int().min(0, "Quantidade de aulas inválida.").default(0),
  notes: optionalText
});

export const subscriptionSchema = z.object({
  studentId: z.string().min(1, "Selecione um aluno."),
  planId: z.string().min(1, "Selecione um plano."),
  dueDay: z.coerce.number().int().min(1).max(31).default(10),
  startedAt: z.string().optional().default(""),
  notes: optionalText
});

export const paymentSchema = z.object({
  subscriptionId: z.string().min(1, "Selecione uma assinatura."),
  referenceMonth: z.string().trim().min(7, "Informe o mês de referência."),
  paidAt: z.string().optional().default(""),
  paymentMethod: optionalText,
  amount: z.string().trim().optional().default(""),
  fiscalDocumentType: z.enum(["", "NFS_E", "NFC_E"]).default("")
});

export const entrySchema = z.object({
  type: z.enum(["REVENUE", "EXPENSE"]),
  category: z.string().trim().min(2, "Informe a categoria."),
  description: z.string().trim().min(2, "Informe a descrição."),
  counterpartyName: optionalText,
  supplierId: z.string().optional().default(""),
  bankAccountId: z.string().optional().default(""),
  planId: z.string().optional().default(""),
  productId: z.string().optional().default(""),
  amount: z.string().trim().min(1, "Informe o valor."),
  discount: z.string().trim().optional().default("0"),
  discountMode: z.enum(["AMOUNT", "PERCENTAGE"]).default("AMOUNT"),
  paymentMethod: optionalText,
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  dueDate: z.string().optional().default(""),
  paidAt: z.string().optional().default(""),
  notes: optionalText
});

export const recurrenceSchema = z.object({
  type: z.enum(["REVENUE", "EXPENSE"]),
  counterpartyName: z.string().trim().min(2, "Informe o cliente."),
  category: z.string().trim().min(2, "Selecione a categoria."),
  description: z.string().trim().min(2, "Informe a descrição."),
  amount: z.string().trim().min(1, "Informe o valor."),
  discount: z.string().trim().optional().default("0"),
  discountMode: z.enum(["AMOUNT", "PERCENTAGE"]).default("AMOUNT"),
  frequency: z.enum(["WEEKLY", "MONTHLY", "ANNUAL"]),
  startsAt: z.string().min(1, "Informe a data inicial."),
  endsAt: z.string().optional().default(""),
  bankAccountId: z.string().optional().default(""),
  planId: z.string().optional().default(""),
  onlinePaymentMethod: z.enum(["", "BOLETO"]).default(""),
  notes: optionalText
});

export const updateEntrySchema = entrySchema.pick({
  category: true,
  description: true,
  counterpartyName: true,
  bankAccountId: true,
  planId: true,
  productId: true,
  amount: true,
  dueDate: true,
  notes: true,
}).extend({
  entryId: z.string().min(1, "Lançamento inválido."),
});

export const financialSettingSchema = z.object({
  area: z.enum(["categorias-financeiras", "formas-pagamento", "contas-bancarias", "fornecedores"]),
  name: z.string().trim().min(2, "Informe o nome."),
  // FormData.get retorna null quando o campo não existe. Contas bancárias e
  // fornecedores não enviam tipo; categorias, por outro lado, continuam com
  // o tipo explícito. Normalizar aqui evita que um cadastro bancário válido
  // seja rejeitado como se fosse uma categoria financeira incompleta.
  type: z.preprocess((value) => value ?? undefined, z.enum(["REVENUE", "EXPENSE", "BOTH"]).default("BOTH")),
  bankName: optionalText,
  openingBalance: z.preprocess((value) => value ?? "0", z.string().trim().default("0")),
  document: optionalText,
  phone: optionalText,
  email: optionalText,
  notes: optionalText
});

export const productCategorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.")
});

export const couponSchema = z.object({
  code: z.string().trim().min(3, "Informe um código com ao menos 3 caracteres.").max(32),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number().int().positive("Informe um desconto maior que zero."),
  minimumAmount: z.string().trim().optional().default("0"),
  maxUses: z.string().trim().optional().default(""),
  startsAt: z.string().trim().optional().default(""),
  endsAt: z.string().trim().optional().default("")
});

export const updateCouponSchema = couponSchema.extend({ couponId: z.string().min(1, "Cupom inválido."), active: z.preprocess((value) => value === "on" || value === true, z.boolean()) });
export const deleteCouponSchema = z.object({ couponId: z.string().min(1, "Cupom inválido.") });
export const couponToggleSchema = z.object({ couponId: z.string().min(1, "Cupom inválido."), active: z.preprocess((value) => value === "on" || value === true, z.boolean()) });
export const financialCategoryUpdateSchema = z.object({ categoryId: z.string().min(1, "Categoria inválida."), name: z.string().trim().min(2, "Informe o nome."), type: z.enum(["REVENUE", "EXPENSE", "BOTH"]) });
export const financialCategoryDeleteSchema = z.object({ categoryId: z.string().min(1, "Categoria inválida.") });
export const supplierUpdateSchema = z.object({ supplierId: z.string().min(1, "Fornecedor inválido."), name: z.string().trim().min(2, "Informe o nome."), document: optionalText, phone: optionalText, email: optionalText, notes: optionalText, active: z.preprocess((value) => value === "on" || value === true, z.boolean()) });
export const deleteSupplierSchema = z.object({ supplierId: z.string().min(1, "Fornecedor inválido.") });

export const fiscalSettingsSchema = z.object({
  provider: z.enum(["NONE", "MANUAL"]),
  environment: z.enum(["SANDBOX", "PRODUCTION"]),
  series: z.string().trim().max(20).default(""),
  nextNumber: z.coerce.number().int().min(1).max(999999999).default(1),
  notes: optionalText
});

export const onlinePaymentSettingsSchema = z.object({
  provider: z.enum(["NONE", "MANUAL"]),
  webhookUrl: z.string().trim().max(500).default(""),
  instructions: optionalText
});

export const settlementSchema = z.object({
  entryId: z.string().min(1, "Conta inválida."),
  amount: z.string().trim().min(1, "Informe o valor recebido."),
  interest: z.string().trim().optional().default("0"),
  paymentMethod: z.string().trim().min(1, "Selecione a forma de pagamento."),
  paidAt: z.string().optional().default(""),
  notes: optionalText
});

export const bulkEntrySchema = z.object({
  entryIds: z.array(z.string().min(1)).min(1, "Selecione ao menos um lançamento."),
  paymentMethod: z.string().trim().min(1, "Selecione a forma de pagamento."),
  paidAt: z.string().optional().default("")
});

export const bulkDeleteEntrySchema = z.object({
  entryIds: z.array(z.string().min(1)).min(1, "Selecione ao menos um lançamento.")
});

export const voidEntrySchema = z.object({
  entryId: z.string().min(1, "Conta inválida."),
  reason: z.string().trim().min(3, "Informe o motivo do estorno.")
});

export const payrollSchema = z.object({
  teacherId: z.string().min(1, "Selecione um professor."),
  referenceMonth: z.string().trim().min(7, "Informe o mês de referência."),
  fixedSalary: z.string().trim().optional().default("0"),
  classValue: z.string().trim().optional().default("0"),
  bonus: z.string().trim().optional().default("0"),
  discount: z.string().trim().optional().default("0"),
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  notes: optionalText
});

export const bankBalanceSchema = z.object({
  bankAccountId: z.string().min(1, "Selecione a conta bancária."),
  balance: z.string().trim().min(1, "Informe o saldo conferido.")
});

export const onlineChargeSchema = z.object({ entryId: z.string().min(1), method: z.enum(["PIX", "BOLETO"]) });

export const paymentConnectionSchema = z.object({
  provider: z.enum(["ASAAS", "SICOOB"]),
  environment: z.enum(["SANDBOX", "PRODUCTION"]),
  accessToken: z.string().trim().optional().default(""),
  clientId: z.string().trim().optional().default(""),
  clientSecret: z.string().trim().optional().default(""),
  pixKey: z.string().trim().optional().default(""),
  certificate: z.string().trim().optional().default(""),
  privateKey: z.string().trim().optional().default(""),
  certificatePassword: z.string().trim().optional().default("")
});

export const teacherMonthlyPayableSchema = z.object({
  teacherId: z.string().min(1, "Professor inválido."),
  entryIds: z.array(z.string().min(1)).min(1, "Selecione ao menos um recebimento quitado."),
  percentage: z.coerce.number().min(0, "Informe um percentual válido.").max(100, "O percentual não pode passar de 100%."),
  referenceStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o início do período."),
  referenceEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o fim do período."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o vencimento.")
});

