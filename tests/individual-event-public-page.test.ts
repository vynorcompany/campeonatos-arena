import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

type Node = { type: unknown; props: Record<string, any> };
function nodes(root: any): Node[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!root || typeof root !== "object" || !("props" in root)) return [];
  return [root, ...nodes(root.props.children)];
}
function page(categories: any[]) {
  const tournament = { name: "Day use", publicSlug: "day-use", arena: { name: "Arena QA", slug: "qa", logoUrl: "" }, categories, publicRegistrations: [], categoryBrackets: [] };
  const exports: any = {};
  const source = readFileSync(new URL("../src/app/inscricao/[slug]/page.tsx", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports,
    require(name: string) {
      if (name === "react/jsx-runtime") return { jsx: (type: unknown, props: object) => ({ type, props }), jsxs: (type: unknown, props: object) => ({ type, props }) };
      if (name === "next/link") return { default: "link" };
      if (name === "next/navigation") return { notFound: () => { throw new Error("Not found"); } };
      if (name === "@/lib/prisma") return { prisma: { $queryRaw: async () => [{ id: "event", arenaId: "arena" }] } };
      if (name === "@/lib/arena-database") return { arenaDatabase: () => ({ tournament: { findUnique: async () => tournament } }) };
      if (name === "@/components/forms/public-registration-form") return { PublicRegistrationForm: "registration-form" };
      if (name === "@/components/athlete-portal-wordmark") return { AthletePortalWordmark: "portal-wordmark" };
      if (name === "@/components/tournaments/public-trio-matches") return { PublicTrioMatches: "trio-games" };
      if (name === "@/lib/ui/classes") return { cx: (...values: string[]) => values.join(" ") };
      if (name === "./page.utilities") return { viewStyles: {} };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports.default;
}

function navigationLabels(result: Node[]) {
  const navigation = result.find(node => node.type === "nav" && node.props["aria-label"] === "Navegação do torneio");
  assert.ok(navigation, "Public category navigation remains explicitly labelled.");
  return [...nodes(navigation.props.children)].filter(node => node.type === "link").map(node => node.props.children);
}

test("public individual category reaches the form with its authoritative type and has no game navigation", async () => {
  const Page = page([{ id: "individual", name: "Day use", registrationType: "INDIVIDUAL", competition: null, internalNote: "must not reach client" }]);
  const result = nodes(await Page({ params: Promise.resolve({ slug: "day-use" }), searchParams: Promise.resolve({ tab: "jogos" }) }));
  const form = result.find(node => node.type === "registration-form")!;
  assert.ok(form, "A game URL for an individual event falls back to registration.");
  assert.equal(form.props.categories[0].registrationType, "INDIVIDUAL");
  assert.equal(form.props.categories[0].internalNote, undefined);
  assert.deepEqual(navigationLabels(result), ["Inscrição", "Inscritos"]);
});

test("mixed events preserve competition navigation and pair/trio registration types", async () => {
  const Page = page([{ id: "individual", name: "Day use", registrationType: "INDIVIDUAL", competition: null }, { id: "pair", name: "Duplas", registrationType: "PAIR", competition: null }]);
  const result = nodes(await Page({ params: Promise.resolve({ slug: "day-use" }) }));
  assert.deepEqual(navigationLabels(result), ["Inscrição", "Inscritos", "Chaveamento", "Jogos"]);
  const categories = result.find(node => node.type === "registration-form")!.props.categories;
  assert.equal(categories[1].registrationType, "PAIR");
});
