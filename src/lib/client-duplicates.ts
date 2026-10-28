import { normalizeBrazilianPhone } from "./phone";

export type MergeClient = { id: string; name: string; phone: string; cpf: string; active: boolean };
export type DuplicateReason = "Nome igual" | "Telefone igual" | "CPF igual";
export type DuplicatePair = { primary: MergeClient; duplicate: MergeClient; reasons: DuplicateReason[] };

export function normalizeClientName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function findClientDuplicates(clients: MergeClient[]): DuplicatePair[] {
  const indexes = new Map<string, MergeClient[]>();
  const pairs = new Map<string, DuplicatePair>();
  for (const client of clients) {
    if (!client.active) continue;
    const phone = normalizeBrazilianPhone(client.phone);
    const cpf = client.cpf.replace(/\D/g, "");
    const keys: [DuplicateReason, string][] = [
      ["Nome igual", normalizeClientName(client.name)],
      ["Telefone igual", /^\d{10,11}$/.test(phone) && !/^(\d)\1+$/.test(phone) ? phone : ""],
      ["CPF igual", /^\d{11}$/.test(cpf) && !/^(\d)\1+$/.test(cpf) ? cpf : ""],
    ];
    for (const [reason, value] of keys) {
      if (!value) continue;
      const key = `${reason}:${value}`;
      const previous = indexes.get(key) ?? [];
      for (const other of previous) {
        if (other.id === client.id) continue;
        const pairKey = JSON.stringify([other.id, client.id].sort());
        const pair = pairs.get(pairKey) ?? { primary: other, duplicate: client, reasons: [] };
        if (!pair.reasons.includes(reason)) pair.reasons.push(reason);
        pairs.set(pairKey, pair);
      }
      previous.push(client);
      indexes.set(key, previous);
    }
  }
  return [...pairs.values()].sort((a, b) => b.reasons.length - a.reasons.length || a.primary.name.localeCompare(b.primary.name, "pt-BR") || a.duplicate.name.localeCompare(b.duplicate.name, "pt-BR"));
}

export function matchesMergeSearch(client: MergeClient, query: string) {
  const name = normalizeClientName(query);
  const digits = /^[\d\s.()+/-]+$/.test(query) ? query.replace(/\D/g, "") : "";
  return !name || normalizeClientName(client.name).includes(name) || Boolean(digits && (normalizeBrazilianPhone(client.phone).includes(normalizeBrazilianPhone(query)) || client.phone.replace(/\D/g, "").includes(digits) || client.cpf.replace(/\D/g, "").includes(digits)));
}
