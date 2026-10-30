"use client";
import { viewStyles } from "./client-merge-picker.utilities";

import { useMemo, useState } from "react";
import { matchesMergeSearch, type MergeClient } from "@/lib/client-duplicates";

export function ClientMergePicker({ label, clients, excludedId, value, onChange, primary = false }: { label: string; primary?: boolean; clients: MergeClient[]; excludedId?: string; value: string; onChange: (id: string) => void }) {
  const selected = clients.find((client) => client.id === value);
  const [query, setQuery] = useState(selected ? `${selected.name} · ${selected.phone || "Sem telefone"}` : "");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const term = selected ? "" : query.trim();
    return clients.filter((client) => client.id !== excludedId && matchesMergeSearch(client, term)).slice(0, 8);
  }, [clients, excludedId, query, selected]);

  return <label onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} className={`${viewStyles.client_merge_picker} ${primary ? "tw:rounded-md tw:border tw:border-[#83acd8] tw:border-l-4 tw:border-l-[#2162aa] tw:bg-white tw:p-3" : ""}`}><span className={primary ? "tw:text-sm tw:font-extrabold tw:text-[#123b6b]" : ""}>{label}</span><input value={selected ? `${selected.name} · ${selected.phone || "Sem telefone"}` : query} placeholder="Pesquisar cliente por nome ou telefone/CPF" autoComplete="off" onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); }} />{open ? <span className={viewStyles.client_merge_search_results} role="listbox" aria-label={`Resultados para ${label}`}>{matches.length ? matches.map((client) => <button type="button" key={client.id} role="option" aria-selected={client.id === value} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(client.id); setQuery(`${client.name} · ${client.phone || "Sem telefone"}`); setOpen(false); }}><strong>{client.name}</strong><small>{client.phone || "Sem telefone"}</small></button>) : <em>Nenhum cliente encontrado.</em>}</span> : null}</label>;
}
