import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { athletePortalManifest, isPortalPwaPath, portalPwaEnabled } from "../src/lib/portal/pwa-policy";
import { portalPwaWorkerSource, disabledPortalPwaWorkerSource } from "../src/lib/portal/pwa-worker";
import { GET as manifestResponse } from "../src/app/portal/manifest.webmanifest/route";
import { GET as workerResponse } from "../src/app/portal/sw.js/route";

test("PWA is off by default and portal route policy excludes management and APIs", () => {
  assert.equal(portalPwaEnabled({}), false); assert.equal(portalPwaEnabled({ PORTAL_PWA_ENABLED: "true" }), true);
  for (const path of ["/portal", "/portal/eventos", "/home", "/classificacao/arena-teste-goal", "/checkin/arena-teste-goal", "/arena-teste-goal/portaldoatleta/agendamento"]) assert.equal(isPortalPwaPath(path), true, path);
  for (const path of ["/", "/login", "/financeiro/contas-a-receber", "/api/portal/comandas", "/portal-falso", "/home/admin"]) assert.equal(isPortalPwaPath(path), false, path);
});

test("manifest uses the approved portal logo, a stable app identity and a neutral arena selector", () => {
  const manifest = athletePortalManifest();
  assert.equal(manifest.id, "/portal"); assert.equal(manifest.start_url, "/portal"); assert.equal(manifest.display, "standalone");
  assert.equal(manifest.name, "VX4");
  assert.ok(manifest.icons.every(icon => icon.src.startsWith("/brand/vx4-app-") && ["any", "maskable"].includes(icon.purpose)));
  const icon = readFileSync("public/brand/vx4-app-512.png"); assert.equal(icon.readUInt32BE(16), 512); assert.equal(icon.readUInt32BE(20), 512);
});

test("disabled routes hide installation metadata and serve only a worker rollback", async () => {
  const saved = process.env.PORTAL_PWA_ENABLED; delete process.env.PORTAL_PWA_ENABLED;
  try {
    assert.equal(manifestResponse().status, 404);
    const worker = workerResponse(); assert.match(await worker.text(), /registration.unregister/);
    assert.equal(worker.headers.get("Service-Worker-Allowed"), "/");
    process.env.PORTAL_PWA_ENABLED = "true";
    const manifest = manifestResponse(); assert.equal(manifest.status, 200); assert.match(manifest.headers.get("Content-Type")!, /application\/manifest\+json/);
    assert.equal((await manifest.json()).name, "VX4");
    assert.match(await workerResponse().text(), /addEventListener\("fetch"/);
  } finally { if (saved === undefined) delete process.env.PORTAL_PWA_ENABLED; else process.env.PORTAL_PWA_ENABLED = saved; }
});

function worker(fetcher: (...args: any[]) => Promise<Response>) {
  const handlers = new Map<string, (event: any) => void>();
  const scope = { location: { origin: "https://portal.example.test" }, addEventListener: (name: string, handler: any) => handlers.set(name, handler) };
  vm.runInNewContext(portalPwaWorkerSource(), { self: scope, URL, Response, fetch: fetcher });
  return (path: string, options: { method?: string; mode?: string } = {}) => {
    let response: Promise<Response> | undefined;
    handlers.get("fetch")!({ request: { url: new URL(path, scope.location.origin).href, method: options.method ?? "GET", mode: options.mode ?? "navigate" }, respondWith: (result: Promise<Response>) => { response = result; } });
    return response;
  };
}

test("worker never intercepts API calls, writes, management, subresources or external origins", () => {
  const dispatch = worker(async () => { throw new Error("should not fetch"); });
  for (const path of ["/api/portal/comandas", "/financeiro", "https://payments.example.test/portal"]) assert.equal(dispatch(path), undefined);
  assert.equal(dispatch("/portal", { method: "POST" }), undefined);
  assert.equal(dispatch("/home", { mode: "cors" }), undefined);
});

test("portal navigation stays network-only and offline fallback contains no account data or queued actions", async () => {
  let options: any;
  const online = worker(async (_request, init) => { options = init; return new Response("live account data"); });
  assert.equal(await (await online("/home")!).text(), "live account data"); assert.equal(options.cache, "no-store");
  const offline = worker(async () => { throw new Error("network offline"); });
  const response = await offline("/classificacao/arena-teste-goal")!;
  assert.equal(response.status, 503); assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.text(); assert.match(body, /Sem conexão/); assert.match(body, /href="\/portal"/); assert.doesNotMatch(body, /<script|<style|live account data/);
  assert.doesNotMatch(portalPwaWorkerSource(), /caches\.|indexedDB|localStorage|sync\.register/);
});

test("worker rollback unregisters itself without deleting any unrelated storage", async () => {
  let handler: any; let removed = false;
  vm.runInNewContext(disabledPortalPwaWorkerSource(), { self: { addEventListener: (name: string, fn: any) => { if (name === "activate") handler = fn; }, registration: { unregister: async () => { removed = true; } } } });
  let done: Promise<void> = Promise.resolve(); handler({ waitUntil: (operation: Promise<void>) => { done = operation; } }); await done;
  assert.equal(removed, true);
});
