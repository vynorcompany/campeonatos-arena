import path from "node:path";

export function isLocalUploadUrl(url: string) {
  return url.startsWith("/uploads/") || url.startsWith("/media/uploads/");
}

export function resolveLocalUploadPath(url: string, legacyRoot: string, persistentRoot: string) {
  if (!isLocalUploadUrl(url)) return null;

  const current = url.startsWith("/media/uploads/");
  const relative = url.slice(current ? "/media/uploads/".length : "/uploads/".length);
  const segments = relative.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\") || segment.includes(":"))) {
    throw new Error("Caminho de upload local inválido.");
  }

  return path.resolve(current ? persistentRoot : legacyRoot, ...segments);
}
