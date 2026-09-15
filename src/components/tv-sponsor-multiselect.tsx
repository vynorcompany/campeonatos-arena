"use client";

import { useMemo, useState } from "react";

type Sponsor = { id: string; name: string };

export function TvSponsorMultiselect({ sponsors, selectedSponsorIds }: { sponsors: Sponsor[]; selectedSponsorIds: string[] }) {
  const [selectedIds, setSelectedIds] = useState(() => selectedSponsorIds.filter((id) => sponsors.some((sponsor) => sponsor.id === id)));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedSponsors = useMemo(() => sponsors.filter((sponsor) => selectedIds.includes(sponsor.id)), [selectedIds, sponsors]);
  const suggestions = useMemo(() => sponsors.filter((sponsor) => !selectedIds.includes(sponsor.id) && sponsor.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))), [query, selectedIds, sponsors]);

  function addSponsor(id: string) {
    setSelectedIds((current) => [...current, id]);
    setQuery("");
    setOpen(true);
  }

  return <div className="tv-sponsor-multiselect">
    {selectedIds.map((id) => <input key={id} type="hidden" name="selectedSponsorIds" value={id} />)}
    <div className="tv-sponsor-multiselect-control" onClick={() => setOpen(true)}>
      <div className="tv-sponsor-tags">
        {selectedSponsors.map((sponsor) => <span key={sponsor.id} className="tv-sponsor-tag">{sponsor.name}<button type="button" aria-label={`Remover ${sponsor.name}`} onClick={(event) => { event.stopPropagation(); setSelectedIds((current) => current.filter((id) => id !== sponsor.id)); }}>×</button></span>)}
        <input aria-label="Adicionar patrocinador" value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder={selectedSponsors.length ? "Adicionar patrocinador" : "Buscar patrocinador"} />
      </div>
      <span className="tv-sponsor-multiselect-arrow" aria-hidden="true">⌄</span>
    </div>
    {open ? <div className="tv-sponsor-multiselect-options" role="listbox" aria-label="Patrocinadores disponíveis">
      {suggestions.length ? suggestions.map((sponsor) => <button key={sponsor.id} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => addSponsor(sponsor.id)}><span>{sponsor.name}</span><small>Adicionar</small></button>) : <p>{sponsors.length === selectedIds.length ? "Todos os patrocinadores foram selecionados." : "Nenhum patrocinador encontrado."}</p>}
    </div> : null}
  </div>;
}
