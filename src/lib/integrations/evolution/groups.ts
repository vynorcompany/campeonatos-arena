const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const jid = (value: unknown) => String(value ?? "").trim().replace(/@g\.us$/i, "");

/** Accept both individual metadata and the envelopes returned by Evolution v2. */
export function readEvolutionGroupName(payload: unknown, remoteJid: string, depth = 0): string {
  if (depth > 5) return "";
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const value = record(item);
      if (![value.id, value.jid, value.groupJid, value.remoteJid].some(id => jid(id) === jid(remoteJid))) continue;
      const name = readEvolutionGroupName(item, remoteJid, depth + 1);
      if (name) return name;
    }
    return "";
  }
  const value = record(payload);
  const identity = value.id ?? value.jid ?? value.groupJid ?? value.remoteJid;
  if (identity && jid(identity) !== jid(remoteJid)) return "";
  for (const field of ["subject", "subjectName", "groupName", "groupSubject", "name"]) {
    if (typeof value[field] === "string" && value[field].trim()) return value[field].trim();
  }
  for (const field of ["data", "response", "groups", "metadata", "groupMetadata"]) {
    const name = readEvolutionGroupName(value[field], remoteJid, depth + 1);
    if (name) return name;
  }
  return "";
}
