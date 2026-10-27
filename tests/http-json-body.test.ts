import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedJson, RequestBodyTooLargeError } from "../src/lib/http/json-body";

const request = (body: string, headers?: HeadersInit) => new Request("https://example.test/webhook", { method: "POST", body, headers });
test("JSON limits count UTF-8 bytes and accept an exact boundary", async () => {
  const body = JSON.stringify({ text: "ação" });
  const size = Buffer.byteLength(body);
  assert.deepEqual(await readBoundedJson(request(body), size), { text: "ação" });
  await assert.rejects(readBoundedJson(request(body), size - 1), RequestBodyTooLargeError);
});
test("oversized declared bodies are rejected before the stream is read", async () => {
  let reads = 0;
  const input = { headers: new Headers({ "content-length": "1000" }), get body() { reads++; throw Error("must not read"); } } as unknown as Request;
  await assert.rejects(readBoundedJson(input, 100), RequestBodyTooLargeError);
  assert.equal(reads, 0);
});
test("chunked bodies cannot bypass the limit with a missing or false Content-Length", async () => {
  for (const declared of [undefined, "1"]) {
    let canceled = false;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(10)); }, cancel() { canceled = true; } });
    const input = { headers: new Headers(declared ? { "content-length": declared } : {}), body: stream } as Request;
    await assert.rejects(readBoundedJson(input, 15), RequestBodyTooLargeError);
    assert.equal(canceled, true);
    assert.equal(stream.locked, false);
  }
});
test("malformed JSON and invalid UTF-8 are rejected", async () => {
  await assert.rejects(readBoundedJson(request("{"), 100), SyntaxError);
  await assert.rejects(readBoundedJson(new Request("https://example.test", { method: "POST", body: new Uint8Array([255]) }), 100), TypeError);
});
