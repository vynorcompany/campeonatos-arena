import { createHash } from "node:crypto";
/** Bounded process-local snapshots of tenant data; authorization stays outside this cache. */
export function createShortSnapshotCache(ttlMs: number, capacity = 24, now = () => Date.now()) {
  if (ttlMs <= 0 || !Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError("Invalid snapshot cache limits");
  const entries = new Map<string, { expires: number; promise: Promise<{ body: string; etag: string }> }>();
  return async (key: string, load: () => Promise<unknown>) => {
    const existing = entries.get(key);
    if (existing && existing.expires > now()) return existing.promise;
    if (existing) entries.delete(key);
    while (entries.size >= capacity) entries.delete(entries.keys().next().value!);
    const entry = { expires: now() + ttlMs, promise: Promise.resolve({ body: "", etag: "" }) };
    entry.promise = load().then(value => {
      const body = JSON.stringify(value);
      const result = { body, etag: JSON.stringify(createHash("sha256").update(body).digest("hex")) };
      // Do not retain unexpectedly large payloads.
      if (Buffer.byteLength(body) > 512_000 && entries.get(key) === entry) entries.delete(key);
      return result;
    }).catch(error => { if (entries.get(key) === entry) entries.delete(key); throw error; });
    entries.set(key, entry);
    return entry.promise;
  };
}
