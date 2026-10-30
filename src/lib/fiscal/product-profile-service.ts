import { fiscalCatalogDate, fiscalTableDate } from "./catalog-date";
import benefits from "./catalog/benefits-pr.json";
import type { Prisma } from "@prisma/client";
import {
  productFiscalProfileSchema,
  fiscalProfileIssues,
  ProductFiscalValidationError,
} from "./product-profile";
import { findNcm, ncmCatalogVersion } from "./ncm-catalog";
import rtc from "./catalog/ibs-cbs.json";
export const rtcCatalogVersion = rtc.checkedAt;
export function findRtc(code: string, today = fiscalCatalogDate()) {
  return rtc.rows.find(
    (row) =>
      row.code === code &&
      row.nfce &&
      (!row.start || row.start.slice(0, 10) <= today) &&
      (!row.end || row.end.slice(0, 10) >= today),
  );
}
export function searchRtc(query: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const today = fiscalCatalogDate();
  return rtc.rows
    .filter(
      (row) =>
        row.nfce &&
        (!row.start || row.start.slice(0, 10) <= today) &&
        (!row.end || row.end.slice(0, 10) >= today) &&
        (row.code.startsWith(q) || normalize(row.label).includes(q)),
    )
    .slice(0, 12)
    .map(({ code, label, cst }) => ({ code, label, cst }));
}
export function findPrBenefit(code: string, today = fiscalCatalogDate()) {
  return benefits.rows.find(
    (row) =>
      row.code === code &&
      row.verifiedDates &&
      row.start &&
      fiscalTableDate(row.start) <= today &&
      (!row.end || fiscalTableDate(row.end) >= today),
  );
}
export async function saveProductFiscalProfile(
  tx: Prisma.TransactionClient,
  arenaId: string,
  userId: string,
  productId: string,
  value: unknown,
  actorName = userId,
) {
  const profile = productFiscalProfileSchema.parse(value);
  const [product, issuer] = await Promise.all([
    tx.product.findFirst({
      where: {
        id: productId,
        arenaId,
        isService: false,
        serviceDeletedAt: null,
      },
      select: { id: true },
    }),
    tx.fiscalSettings.findUnique({
      where: { arenaId },
      select: { crt: true, issuerState: true },
    }),
  ]);
  if (!product)
    throw new ProductFiscalValidationError(
      "Produto não encontrado nesta arena.",
    );
  const issues = fiscalProfileIssues(profile, issuer ?? {});
  if (profile.ncm && !findNcm(profile.ncm))
    issues.push("NCM não encontrado na tabela oficial vigente.");
  if (profile.cClassTrib) {
    const classification = findRtc(profile.cClassTrib);
    if (!classification || classification.cst !== profile.ibsCbsCst)
      issues.push(
        "Classificação IBS/CBS inexistente, vencida ou não aplicável à NFC-e.",
      );
  }
  if (
    profile.benefitCode &&
    (issuer?.issuerState === "PR" || profile.benefitCode.startsWith("PR"))
  ) {
    const benefit = findPrBenefit(profile.benefitCode);
    if (!benefit)
      issues.push(
        "cBenef não encontrado com vigência confirmada na tabela oficial do Paraná.",
      );
    else if (
      profile.icmsCode.length === 2 &&
      !benefit.csts.includes(profile.icmsCode)
    )
      issues.push("cBenef incompatível com o CST ICMS na tabela do Paraná.");
  }
  if (issues.length) throw new ProductFiscalValidationError(issues[0]);
  await tx.product.update({
    where: { id: product.id, arenaId },
    data: { fiscalProfile: profile, updatedByUserId: userId },
  });
  await tx.auditEvent.create({
    data: {
      arenaId,
      actorId: userId,
      actorName,
      action: "PRODUCT_FISCAL_PROFILE_UPDATED",
      entityId: product.id,
      details: {
        ncmTable: ncmCatalogVersion,
        benefitsPrTable: benefits.version,
        rtcCheckedAt: rtc.checkedAt,
        issuerCrt: issuer?.crt ?? "",
        issuerState: issuer?.issuerState ?? "",
        profile,
      },
    },
  });
}
