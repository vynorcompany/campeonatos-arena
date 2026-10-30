import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function route() {
  const calls: unknown[][] = [];
  const mod = { exports: {} as { GET: (request: Request) => Promise<Response> } };
  const source = ts.transpileModule(fs.readFileSync("src/app/api/portal/comandas/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports: mod.exports, module: mod, URL, Response, require: (name: string) => {
    if (name === "@/lib/auth/player-session") return { getPublicPlayerAuth: async (slug: string) => slug === "minha-arena" ? { playerId: "meu-atleta" } : null };
    if (name === "@/lib/services/public-client-home") return { getPublicClientComandas: async (...args: unknown[]) => { calls.push(args); return { disabled: false, comandas: [{ id: "minha-comanda" }], products: [{ id: "catalogo-nao-deve-viajar" }] }; } };
    return require(name);
  } });
  return { GET: mod.exports.GET, calls };
}
test("atualização de comandas exige sessão da arena e ignora atleta informado pelo navegador", async () => {
  const { GET, calls } = route();
  assert.equal((await GET(new Request("http://local/api/portal/comandas"))).status, 400);
  assert.equal((await GET(new Request("http://local/api/portal/comandas?arenaSlug=outra-arena"))).status, 401);
  assert.equal(calls.length, 0);
  const response = await GET(new Request("http://local/api/portal/comandas?arenaSlug=minha-arena&playerId=outro-atleta"));
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [["minha-arena", "meu-atleta", { catalog: false }]]);
  assert.deepEqual(await response.json(), { disabled: false, comandas: [{ id: "minha-comanda" }] });
  assert.match(response.headers.get("cache-control")!, /private, no-store/);
});
test("consulta sem mudanças responde 304 sem retransmitir comandas nem catálogo", async () => {
  const { GET } = route(), url = "http://local/api/portal/comandas?arenaSlug=minha-arena";
  const first = await GET(new Request(url)), etag = first.headers.get("etag")!;
  assert.ok(etag);
  const unchanged = await GET(new Request(url, { headers: { "If-None-Match": etag } }));
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), "");
  assert.equal(unchanged.headers.get("etag"), etag);
});
