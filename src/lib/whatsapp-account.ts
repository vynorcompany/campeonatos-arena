export function normalizeWhatsAppAccountJid(value: string) {
  const jid = value.trim().toLowerCase();
  const [number, domain] = jid.split("@");
  if (!number || !domain) return "";
  const normalizedNumber = number.split(":")[0].replace(/\D/g, "");
  return normalizedNumber && ["s.whatsapp.net", "c.us"].includes(domain) ? `${normalizedNumber}@s.whatsapp.net` : "";
}
