import assert from "node:assert/strict";
import test from "node:test";
import { verifyPublicCopy } from "../scripts/r2-copy-verification";

test("checks publicly served bytes before switching an image URL", async () => {
  let calls = 0;
  const request = async () => {
    calls++;
    return new Response(Buffer.from("original"));
  };

  await verifyPublicCopy("https://assets.example.com/image.webp", Buffer.from("original"), request as typeof fetch);
  assert.equal(calls, 1);
});

test("rejects a different public image and preserves the old URL", async () => {
  let calls = 0;
  const request = async () => {
    calls++;
    return new Response(Buffer.from("different"));
  };

  await assert.rejects(
    verifyPublicCopy("https://assets.example.com/image.webp", Buffer.from("original"), request as typeof fetch),
    /não passou na validação pública/
  );
  assert.equal(calls, 3);
});
