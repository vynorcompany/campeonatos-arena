import { parseDate, parseMoneyToCents } from "@/lib/finance/inputs";

export type CouponValuesInput = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minimumAmount: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
};

export function getCouponValues(input: CouponValuesInput) {
  if (input.discountType === "PERCENTAGE" && input.discountValue > 100) {
    throw new Error("O desconto percentual não pode passar de 100%.");
  }
  const startsAt = input.startsAt ? parseDate(input.startsAt) : null;
  const endsAt = input.endsAt ? parseDate(input.endsAt) : null;
  if ((input.startsAt && !startsAt) || (input.endsAt && !endsAt)) {
    throw new Error("Informe datas válidas para o cupom.");
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new Error("A validade final deve ser posterior à inicial.");
  }
  const maxUses = input.maxUses ? Number(input.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    throw new Error("Informe um limite de uso válido.");
  }
  return {
    code: input.code.toUpperCase().replace(/\s+/g, ""),
    discountType: input.discountType,
    discountValue: input.discountValue,
    minimumAmountCents: parseMoneyToCents(input.minimumAmount),
    maxUses,
    startsAt,
    endsAt,
  };
}
