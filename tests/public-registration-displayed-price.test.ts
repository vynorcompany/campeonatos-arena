import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

type Node = { type: unknown; props: Record<string, any> };
function nodes(value: any): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !value.props) return [];
  return [value, ...nodes(value.props.children)];
}
function text(value: any): string {
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (value && typeof value === "object") return text(value.props?.children);
  return value == null ? "" : String(value);
}
function render(onlinePaymentEnabled: boolean, prices: number[]) {
  const exports: any = {};
  const source = readFileSync(new URL("../src/components/forms/public-registration-form.tsx", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    require(name: string) {
      if (name === "react/jsx-runtime") return { jsx: (type: unknown, props: object) => ({ type, props }), jsxs: (type: unknown, props: object) => ({ type, props }) };
      if (name === "react") return { useState: (initial: unknown) => [initial, () => {}], useEffect: () => {} };
      if (name === "react-dom") return { useFormState: (_action: unknown, initial: unknown) => [initial, () => {}] };
      if (name === "next/navigation") return { useRouter: () => ({ push: () => {} }) };
      if (name.endsWith(".utilities")) return { viewStyles: new Proxy({}, { get: () => "" }) };
      if (name === "@/lib/ui/classes") return { cx: (...values: string[]) => values.join(" ") };
      if (name === "@/lib/actions/public-registration") return { createPublicRegistrationAction: () => {} };
      if (name.startsWith("@/components/")) return new Proxy({}, { get: (_target, key) => String(key) });
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports.PublicRegistrationForm({ tournamentSlug: "event", arenaName: "Arena QA", arenaLogoUrl: "", onlinePaymentEnabled, categories: [{ id: "category", name: "Individual", registrationType: "INDIVIDUAL", priceFirstCents: prices[0], priceSecondCents: prices[1], priceThirdCents: prices[2] }] });
}
for (const online of [true, false]) {
  test(`registration displays the selected category price before submission (${online ? "online" : "local"})`, () => {
    const root = render(online, [7500, 5000, 0]);
    const priceRow = nodes(root).find(node => node.type === "div" && [node.props.children].flat().some(child => child?.type === "dt" && text(child) === "Por pessoa"));
    assert.ok(priceRow, "The displayed base price is explicitly per person.");
    assert.match(text(priceRow), /75,00/);
    assert.doesNotMatch(text(root), /A calcular/);
    assert.match(text(root), /50,00/);
    assert.match(text(root), /Gratuita/);
  });
}
test("a free online category displays free pricing instead of an unknown amount", () => {
  const root = render(true, [0, 0, 0]);
  assert.match(text(root), /Gratuita/);
  assert.doesNotMatch(text(root), /A calcular/);
});
