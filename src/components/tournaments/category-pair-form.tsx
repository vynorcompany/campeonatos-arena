"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { addManualPairAction } from "@/lib/actions/category-competition";

type AthleteOption = { id: string; name: string };

function normalizeAthleteSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function AthleteSearchField({ id, label, name, athletes, excludedId, onSelect }: { id: string; label: string; name: string; athletes: AthleteOption[]; excludedId?: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AthleteOption | null>(null);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const term = normalizeAthleteSearch(query.trim());
    return athletes.filter((athlete) => athlete.id !== excludedId && (!term || normalizeAthleteSearch(athlete.name).includes(term))).slice(0, 8);
  }, [athletes, excludedId, query]);

  return <div className="field category-athlete-search">
    <label htmlFor={id}>{label}</label>
    <input name={name} type="hidden" value={selected?.id ?? ""} />
    <input id={id} className="category-athlete-search-input" value={query} placeholder="Pesquisar atleta" autoComplete="off" required onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setSelected(null); onSelect(""); setOpen(true); }} />
    {open ? <div className="category-athlete-search-results" role="listbox" aria-label={`Resultados para ${label}`}>
      {matches.length ? matches.map((athlete) => <button key={athlete.id} type="button" role="option" aria-selected={selected?.id === athlete.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setSelected(athlete); setQuery(athlete.name); onSelect(athlete.id); setOpen(false); }}>{athlete.name}</button>) : <span>Nenhum atleta encontrado.</span>}
    </div> : null}
  </div>;
}

export function CategoryPairForm({ competitionId, athletes }: { competitionId: string; athletes: AthleteOption[] }) {
  const [firstPlayerId, setFirstPlayerId] = useState("");
  const [secondPlayerId, setSecondPlayerId] = useState("");

  return <SafeActionForm action={addManualPairAction} className="grid-form category-pair-form" successMessage="Dupla adicionada com sucesso." resetOnSuccess>
    <input type="hidden" name="competitionId" value={competitionId} />
    <AthleteSearchField id={`first-player-${competitionId}`} label="Primeiro atleta" name="firstPlayerId" athletes={athletes} excludedId={secondPlayerId} onSelect={setFirstPlayerId} />
    <AthleteSearchField id={`second-player-${competitionId}`} label="Segundo atleta" name="secondPlayerId" athletes={athletes} excludedId={firstPlayerId} onSelect={setSecondPlayerId} />
    <div className="field field-submit category-pair-submit"><SubmitButton label="Adicionar dupla" pendingLabel="Adicionando..." className="button button-primary" disabled={athletes.length < 2} /></div>
    {athletes.length < 2 ? <p className="muted form-full">Disponibilize ao menos dois atletas ativos, elegíveis e ainda sem dupla nesta categoria em <Link href="/players">Gestão → Atletas</Link>.</p> : null}
  </SafeActionForm>;
}
