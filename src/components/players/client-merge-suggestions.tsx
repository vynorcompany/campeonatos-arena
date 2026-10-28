"use client";

import { useMemo, useState } from "react";
import { findClientDuplicates, matchesMergeSearch, type MergeClient } from "@/lib/client-duplicates";

export function ClientMergeSuggestions({ clients, primaryId, duplicateId, onSelect }: { clients: MergeClient[]; primaryId: string; duplicateId: string; onSelect: (primary: string, duplicate: string) => void }) {
  const [query, setQuery] = useState("");
  const pairs = useMemo(() => findClientDuplicates(clients), [clients]);
  const matches = pairs.filter(pair => matchesMergeSearch(pair.primary, query) || matchesMergeSearch(pair.duplicate, query));
  return <section aria-label="Possíveis contatos duplicados" className="tw:grid tw:min-h-0 tw:gap-2">
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><strong className="tw:text-sm tw:text-[#203650]">Possíveis duplicados <span className="tw:font-normal tw:text-[#51657d]">({pairs.length})</span></strong><input aria-label="Filtrar possíveis duplicados" placeholder="Nome, telefone ou CPF" value={query} onChange={event => setQuery(event.target.value)} className="tw:w-full! tw:sm:w-64!" /></div>
    <div className="tw:max-h-56 tw:overflow-y-auto tw:rounded-md tw:border tw:border-[#d5e1ee]" aria-label="Sugestões de duplicidade">
      {matches.length ? matches.map(pair => {
        const selected = [primaryId, duplicateId].includes(pair.primary.id) && [primaryId, duplicateId].includes(pair.duplicate.id);
        return <button type="button" key={JSON.stringify([pair.primary.id, pair.duplicate.id])} aria-pressed={selected} onClick={() => onSelect(pair.primary.id, pair.duplicate.id)} className={`tw:grid tw:w-full tw:grid-cols-1 tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-[#e2eaf3] tw:px-3 tw:py-3 tw:text-left tw:last:border-b-0 tw:sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] tw:sm:items-center tw:hover:bg-[#f2f8ff] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-[-2px] tw:focus-visible:outline-[#2162aa] ${selected ? "tw:bg-[#edf5ff]" : "tw:bg-white"}`}>
          {[pair.primary, pair.duplicate].map(client => <span key={client.id} className="tw:grid tw:min-w-0 tw:gap-1 tw:break-words"><strong className="tw:text-sm tw:text-[#203650]">{client.name}</strong><small className="tw:text-xs tw:text-[#51657d]">{client.phone || "Sem telefone"}{client.cpf ? ` · CPF …${client.cpf.replace(/\D/g, "").slice(-4)}` : ""}</small></span>)}
          <span className="tw:text-xs tw:font-semibold tw:text-[#2162aa]">{pair.reasons.join(" · ")}</span>
        </button>;
      }) : <p className="tw:m-0 tw:p-4 tw:text-sm tw:text-[#51657d]" role="status">{pairs.length ? "Nenhum duplicado corresponde à busca." : "Nenhum possível duplicado por nome, telefone ou CPF."}</p>}
    </div>
  </section>;
}
