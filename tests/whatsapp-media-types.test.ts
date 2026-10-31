import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { outgoingWhatsAppMediaKind, safeWhatsAppMediaType, attachmentMimeType, attachmentFileName } from "../src/lib/whatsapp-media-types";

test("mídias comuns continuam visíveis e conteúdo ativo vira download", () => {
  for (const mimeType of ["image/jpeg", "image/png", "image/gif", "image/webp", "audio/ogg", "audio/webm", "audio/mpeg", "video/mp4", "video/webm", "application/pdf"]) {
    assert.deepEqual(safeWhatsAppMediaType(mimeType), { mimeType, disposition: "inline" });
  }
  for (const mimeType of ["image/svg+xml", "text/html", "application/javascript", "IMAGE/SVG+XML", ""]) {
    assert.deepEqual(safeWhatsAppMediaType(mimeType), { mimeType: "application/octet-stream", disposition: "attachment" });
  }
  assert.equal(outgoingWhatsAppMediaKind("image/svg+xml"), null);
  assert.equal(outgoingWhatsAppMediaKind("image/png"), "image");
  assert.equal(outgoingWhatsAppMediaKind("application/pdf"), "document");
});

test("a rota de mídia autentica a arena e impede interpretação de tipo não confiável", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/whatsapp/media/[messageId]/route.ts"), "utf8");
  assert.match(route, /requireModuleView\("support"\)/);
  assert.match(route, /conversation: \{ arenaId: auth\.arenaId, accountJid \}/);
  assert.match(route, /safeWhatsAppMediaType/);
  assert.match(route, /"x-content-type-options": "nosniff"/);
  assert.match(route, /media\.disposition === "attachment" \? \{ "content-security-policy": "sandbox" \}/);
});

test("a resposta HTTP não interpreta SVG como conteúdo ativo no domínio da arena", async () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/api/whatsapp/media/[messageId]/route.ts"), "utf8");
  const exports: Record<string, (...args: unknown[]) => Promise<Response>> = {};
  const require = createRequire(import.meta.url);
  let mediaMimeType = "image/svg+xml";
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Buffer,
    require: (name: string) => {
      if (name === "@/lib/auth/guards") return { requireModuleView: async () => ({ arenaId: "arena-a" }) };
      if (name === "@/lib/whatsapp-active-account") return { getActiveWhatsAppAccountJid: async () => "account-a" };
      if (name === "@/lib/prisma") return { prisma: { whatsAppMessage: { findFirst: async () => ({ mediaUrl: `data:${mediaMimeType};base64,PHN2Zz48L3N2Zz4=`, mediaMimeType }) } } };
      if (name === "@/lib/arena-database") return { arenaDatabase: () => ({ whatsAppMessage: { findFirst: async () => ({ mediaUrl: `data:${mediaMimeType};base64,PHN2Zz48L3N2Zz4=`, mediaMimeType }) } }) };
      if (name === "@/lib/whatsapp-media-types") return { safeWhatsAppMediaType };
      if (name === "@/lib/integrations/evolution/client") return {};
      return require(name);
    },
  });
  const response = await exports.GET({}, { params: Promise.resolve({ messageId: "message-a" }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/octet-stream");
  assert.match(response.headers.get("content-disposition") ?? "", /^attachment/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("content-security-policy"), "sandbox");
  for (const safeMimeType of ["image/png", "audio/webm", "video/mp4", "application/pdf"]) {
    mediaMimeType = safeMimeType;
    const safeResponse = await exports.GET({}, { params: Promise.resolve({ messageId: "message-a" }) });
    assert.equal(safeResponse.headers.get("content-type"), safeMimeType);
    assert.match(safeResponse.headers.get("content-disposition") ?? "", /^inline/);
    assert.equal(safeResponse.headers.get("content-security-policy"), null);
  }
});

test("a rota de mídia não entrega anexos de outra arena nem da conta anterior", async () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/api/whatsapp/media/[messageId]/route.ts"), "utf8");
  const exports: Record<string, (...args: unknown[]) => Promise<Response>> = {};
  const require = createRequire(import.meta.url);
  let arenaId = "arena-a";
  let accountJid = "account-a";
  const seen: unknown[] = [];
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Buffer,
    require: (name: string) => {
      if (name === "@/lib/auth/guards") return { requireModuleView: async () => ({ arenaId }) };
      if (name === "@/lib/whatsapp-active-account") return { getActiveWhatsAppAccountJid: async () => accountJid };
      if (name === "@/lib/arena-database") return { arenaDatabase: (requestedArena: string) => ({ whatsAppMessage: { findFirst: async (query: { where: { id: string; conversation: { arenaId: string; accountJid: string } } }) => {
        seen.push({ requestedArena, where: query.where });
        return requestedArena === "arena-a" && query.where.id === "message-a" && query.where.conversation.arenaId === "arena-a" && query.where.conversation.accountJid === "account-a"
          ? { mediaUrl: "data:image/png;base64,iVBORw0KGgo=", mediaMimeType: "image/png", providerPayload: null }
          : null;
      } } }) };
      if (name === "@/lib/whatsapp-media-types") return { safeWhatsAppMediaType };
      if (name === "@/lib/integrations/evolution/client") return { getEvolutionMediaDataUrl: async () => { throw new Error("No provider request expected"); } };
      return require(name);
    },
  });
  const request = () => exports.GET({}, { params: Promise.resolve({ messageId: "message-a" }) });
  assert.equal((await request()).status, 200);
  accountJid = "account-new";
  assert.equal((await request()).status, 404);
  accountJid = "account-a";
  arenaId = "arena-b";
  assert.equal((await request()).status, 404);
  assert.equal(seen.length, 3);
});


test("anexos comuns preservam nome e extensão sem liberar conteúdo ativo inline", () => {
  const word = attachmentMimeType({ name: "Proposta.docx", type: "" });
  assert.equal(outgoingWhatsAppMediaKind(word), "document");
  assert.deepEqual(safeWhatsAppMediaType(word), { mimeType: "application/octet-stream", disposition: "attachment" });
  assert.equal(attachmentMimeType({ name: "Planilha.xlsx", type: "application/octet-stream" }), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(outgoingWhatsAppMediaKind(attachmentMimeType({ name: "executar.exe", type: "" })), null);
  assert.equal(attachmentFileName("C:\\pasta\\Orçamento\r\n.pdf"), "Orçamento.pdf");
  assert.equal(attachmentFileName("/tmp/relatório.csv"), "relatório.csv");
});
