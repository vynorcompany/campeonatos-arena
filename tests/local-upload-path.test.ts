import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { isLocalUploadUrl, resolveLocalUploadPath } from "../scripts/local-upload-path";

const legacyRoot = path.resolve("fixture", "public", "uploads");
const persistentRoot = path.resolve("fixture", "volume", "uploads");

test("resolves both historical and current local upload URLs to their correct source", () => {
  assert.equal(resolveLocalUploadPath("/uploads/events/old.jpg", legacyRoot, persistentRoot), path.join(legacyRoot, "events", "old.jpg"));
  assert.equal(resolveLocalUploadPath("/media/uploads/portal-events/new.webp", legacyRoot, persistentRoot), path.join(persistentRoot, "portal-events", "new.webp"));
  assert.equal(isLocalUploadUrl("https://cdn.example.test/arenas/one/photo.jpg"), false);
  assert.equal(resolveLocalUploadPath("https://cdn.example.test/arenas/one/photo.jpg", legacyRoot, persistentRoot), null);
});

test("rejects a stored upload URL that tries to escape the upload directory", () => {
  assert.throws(() => resolveLocalUploadPath("/media/uploads/../private.txt", legacyRoot, persistentRoot), /Caminho de upload local inválido/);
  assert.throws(() => resolveLocalUploadPath("/uploads/events\\private.txt", legacyRoot, persistentRoot), /Caminho de upload local inválido/);
});
