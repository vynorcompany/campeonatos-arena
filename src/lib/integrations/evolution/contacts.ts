export type EvolutionContact = { remoteJid: string; name: string; phone: string };

/** Only identified personal contacts; never interpret an envelope's name as a contact. */
export function readEvolutionContacts(payload: unknown): EvolutionContact[] {
  const contacts = new Map<string, EvolutionContact>();
  function visit(input: unknown, depth: number) {
    if (depth > 5 || !input || typeof input !== "object") return;
    if (Array.isArray(input)) { input.slice(0, 10_000).forEach(item => visit(item, depth + 1)); return; }
    const value = input as Record<string, unknown>;
    const raw = String(value.remoteJid ?? value.jid ?? value.id ?? "").trim().toLowerCase();
    // A LID is not a telephone number. Do not manufacture phone contacts from it.
    const match = /^(\d{7,15})(?::\d+)?@(s\.whatsapp\.net|c\.us)$/.exec(raw);
    if (match) {
      const name = [value.name, value.pushName, value.notify, value.verifiedName].find(item => typeof item === "string" && item.trim());
      // Evolution also returns the telephone itself as pushName for unnamed entries.
      if (typeof name === "string" && name.trim() !== raw && name.replace(/[+\s().-]/g, "") !== match[1]) contacts.set(`${match[1]}@s.whatsapp.net`, { remoteJid: `${match[1]}@s.whatsapp.net`, phone: match[1], name: name.trim().slice(0, 200) });
      return;
    }
    for (const field of ["data", "response", "contacts"]) visit(value[field], depth + 1);
  }
  visit(payload, 0);
  return [...contacts.values()];
}
