import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithDeadline } from "../src/lib/http/fetch-with-deadline";

test("provider requests preserve payload, credentials and cache while applying a deadline", async () => {
  let calls = 0;
  const fake = (async (url, init) => {
    calls++;
    assert.equal(url, "https://provider.test/send");
    assert.equal(init?.method, "POST");
    assert.deepEqual(init?.headers, { Authorization: "Bearer fixture" });
    assert.equal(init?.body, "payload");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    return new Response("ok");
  }) as typeof fetch;
  assert.equal(await (await fetchWithDeadline(fake, "https://provider.test/send", { method: "POST", headers: { Authorization: "Bearer fixture" }, body: "payload", cache: "no-store" })).text(), "ok");
  assert.equal(calls, 1);
});

test("a stalled provider is aborted once without retrying its side effect", async () => {
  let calls = 0;
  const fake = (async (_url, init) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason), { once: true }));
  }) as typeof fetch;
  // AbortSignal.timeout is unref'ed; keep this test's event loop alive explicitly.
  const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(fetchWithDeadline(fake, "https://provider.test", {}, 10), { name: "TimeoutError" }); }
  finally { clearTimeout(keepAlive); }
  assert.equal(calls, 1);
});

test("caller cancellation is preserved for both Request and init signals", async () => {
  for (const asRequest of [false, true]) {
    const controller = new AbortController();
    const reason = new Error("caller canceled");
    controller.abort(reason);
    const fake = (async (_url, init) => { assert.equal(init?.signal?.aborted, true); assert.equal(init.signal.reason, reason); return new Response(); }) as typeof fetch;
    await fetchWithDeadline(fake, asRequest ? new Request("https://provider.test", { signal: controller.signal }) : "https://provider.test", asRequest ? {} : { signal: controller.signal });
  }
});
