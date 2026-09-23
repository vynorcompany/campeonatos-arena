import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { getCouponValues } from "@/lib/finance/coupons";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("financial setting workspaces persist product categories, coupons and integration settings per arena", () => {
  const schema = read("prisma/schema.prisma");
  const actions = read("src/lib/actions/finance.ts");
  const page = read("src/app/(app)/financeiro/configuracoes/[area]/page.tsx");

  assert.match(schema, /model Coupon \{/);
  assert.match(schema, /model FiscalSettings \{/);
  assert.match(schema, /model OnlinePaymentSettings \{/);
  assert.match(schema, /model ProductCategory \{[\s\S]*@@unique\(\[arenaId, name\]\)/);
  assert.match(schema, /model Coupon \{[\s\S]*@@unique\(\[arenaId, code\]\)/);
  assert.match(actions, /export async function createProductCategoryAction/);
  assert.match(actions, /export async function createCouponAction/);
  assert.match(actions, /export async function updateFiscalSettingsAction/);
  assert.match(actions, /export async function updateOnlinePaymentSettingsAction/);
  assert.match(page, /createProductCategoryAction/);
  assert.match(page, /createCouponAction/);
  assert.match(page, /updateFiscalSettingsAction/);
  assert.match(page, /connectPaymentProviderAction/);
});

test("product create and edit forms allow selecting an arena product category", () => {
  const actions = read("src/lib/actions/pos.ts");
  const createPage = read("src/app/(app)/pdv/novo/page.tsx");
  const editPage = read("src/app/(app)/pdv/[productId]/page.tsx");

  assert.match(actions, /categoryId/);
  assert.match(createPage, /name="categoryId"/);
  assert.match(editPage, /name="categoryId"/);
});

test("coupon values are normalized and validated outside the server action", () => {
  const values = getCouponValues({ code: "  aula 10 ", discountType: "PERCENTAGE", discountValue: 10, minimumAmount: "25,00", maxUses: "", startsAt: "", endsAt: "" });

  assert.equal(values.code, "AULA10");
  assert.equal(values.minimumAmountCents, 2500);
  assert.throws(() => getCouponValues({ ...values, discountType: "PERCENTAGE", discountValue: 101, minimumAmount: "0", maxUses: "", startsAt: "", endsAt: "" }), /não pode passar/);
});
