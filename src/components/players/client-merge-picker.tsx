"use client";

import { useMemo, useState } from "react";

type ClientOption = { id: string; name: string; phone: string };

function normalize(value: string) {
  if (/^[\d\s()+-]+$/.test(value)) return value.replace(/\D/g, "");
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function ClientMergePicker({ label, clients, excludedId, value, onChange }: { label: string; clients: ClientOption[]; excludedId?: string; value: string; onChange: (id: string) => void }) {
  const selected = clients.find((client) => client.id === value);
  const [query, setQuery] = useState(selected ? `${selected.name} · ${selected.phone || "Sem telefone"}` : "");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const term = normalize(query.trim());
    return clients.filter((client) => client.id !== excludedId && (!term || normalize(client.name).includes(term) || normalize(client.phone).includes(term))).slice(0, 8);
  }, [clients, excludedId, query]);

  return <label className="client-merge-picker">{label}<input value={query} placeholder="Pesquisar cliente por nome ou telefone" autoComplete="off" onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); }} />{open ? <span className="client-merge-search-results" role="listbox" aria-label={`Resultados para ${label}`}>{matches.length ? matches.map((client) => <button type="button" key={client.id} role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(client.id); setQuery(`${client.name} · ${client.phone || "Sem telefone"}`); setOpen(false); }}><strong>{client.name}</strong><small>{client.phone || "Sem telefone"}</small></button>) : <em>Nenhum cliente encontrado.</em>}</span> : null}</label>;
}
