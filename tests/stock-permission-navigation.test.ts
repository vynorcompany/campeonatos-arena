import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { canEditModule, canViewModule } from "@/lib/permissions";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("stock view does not grant editing or POS permission", () => {
  assert.equal(canViewModule("stock", "STAFF", "VIEWER", ["stock"]), true);
  assert.equal(canEditModule("stock", "STAFF", "VIEWER", []), false);
  assert.equal(canViewModule("pos", "STAFF", "VIEWER", ["stock"]), false);
});

test("product detail follows stock permission and separates view from edit", () => {
  const detail = read("src/app/(app)/pdv/[productId]/page.tsx");
  const list = read("src/app/(app)/pdv/estoque/page.tsx");
  const workspace = read("src/components/products/stock-workspace.tsx");
  const services = read("src/components/products/standard-service-prices.tsx");

  assert.match(detail, /requireModuleView\("stock"\)/);
  assert.doesNotMatch(detail, /requireModuleView\("pos"\)/);
  assert.match(detail, /canEditModule\(\s*"stock"/);
  assert.match(list, /canEdit=\{canEditModule\("stock"/);
  assert.match(workspace, /canEdit \? <details/);
  assert.match(workspace, /canEdit \? "Editar" : "Ver"/);
  assert.match(services, /canEdit \? <SafeActionForm/);
});
