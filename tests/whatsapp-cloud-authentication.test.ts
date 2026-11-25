import assert from "node:assert/strict";
import test from "node:test";
import { sendCloudAuthenticationCode } from "../src/lib/integrations/whatsapp-cloud/authentication";

const config = { accessToken: "private-test-token", phoneNumberId: "123456789", templateName: "portal_codigo_acesso", language: "pt_BR", apiVersion: "v25.0" };
test("official OTP uses the approved template and copy-code button, with no redirects or cache", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://graph.facebook.com/v25.0/123456789/messages");
    assert.equal(options?.redirect, "error"); assert.equal(options?.cache, "no-store");
    assert.equal(new Headers(options?.headers).get("authorization"), "Bearer private-test-token");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.to, "5511999990000"); assert.equal(body.template.language.code, "pt_BR");
    assert.equal(body.template.name, "portal_codigo_acesso");
    assert.deepEqual(body.template.components, [
      { type: "body", parameters: [{ type: "text", text: "123456" }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "123456" }] },
    ]);
    return Response.json({ messages: [{ id: "wamid.test" }] });
  };
  assert.deepEqual(await sendCloudAuthenticationCode("+55 (11) 99999-0000", "123456", config, transport), { messageId: "wamid.test" });
  assert.equal(calls, 1);
});

test("official OTP fails closed on invalid configuration and never sends to an injected endpoint", async () => {
  let calls = 0; const transport: typeof fetch = async () => { calls++; return Response.json({}); };
  for (const patch of [{ accessToken: "" }, { phoneNumberId: "123/../me" }, { apiVersion: "https://attacker.invalid" }, { templateName: "bad template" }]) {
    await assert.rejects(sendCloudAuthenticationCode("11999990000", "123456", { ...config, ...patch }, transport), /configurado/);
  }
  await assert.rejects(sendCloudAuthenticationCode("123", "123456", config, transport), /inválido/);
  await assert.rejects(sendCloudAuthenticationCode("11999990000", "not-code", config, transport), /inválido/);
  assert.equal(calls, 0);
});

test("rejected, malformed or ambiguous responses do not acknowledge an OTP or expose provider details", async () => {
  for (const response of [new Response("private-test-token 123456", { status: 401 }), Response.json({ error: { message: "private-test-token 123456" } }), Response.json({ messages: [] }), new Response("not-json")]) {
    await assert.rejects(sendCloudAuthenticationCode("11999990000", "123456", config, async () => response), error => {
      assert.match(String(error), /API oficial/); assert.doesNotMatch(String(error), /private-test-token|123456/); return true;
    });
  }
  let calls = 0;
  await assert.rejects(sendCloudAuthenticationCode("11999990000", "123456", config, async () => { calls++; throw new Error("private-test-token"); }), /API oficial/);
  assert.equal(calls, 1, "ambiguous network failure must not duplicate OTP delivery");
});
