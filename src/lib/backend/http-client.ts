import { z } from "zod";

/** A deployment-controlled origin, never derived from a browser's Host header. */
export function backendOrigin(value: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Invalid backend origin");
  }
  return url;
}

export async function readBackendContract<T>(origin: string, path: string, schema: z.ZodType<T>, session?: { cookie: string }): Promise<T> {
  if (!path.startsWith("/api/") || path.startsWith("//") || path.includes("\\")) throw new Error("Invalid backend path");
  const base = backendOrigin(origin);
  const target = new URL(path, base);
  if (target.origin !== base.origin || !target.pathname.startsWith("/api/")) throw new Error("Invalid backend path");
  const response = await fetch(target, {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/json", ...(session ? { cookie: session.cookie } : {}) },
  });
  if (!response.ok) throw new Error("Backend request failed");
  return schema.parse(await response.json());
}
