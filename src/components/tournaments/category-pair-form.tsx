"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./category-pair-form.utilities";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { addManualPairAction } from "@/lib/actions/category-competition";

type AthleteOption = { id: string; name: string };

function normalizeAthleteSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function AthleteSearchField({ id, label, name, athletes, excludedId, onSelect, compact = false }: { id: string; label: string; name: string; athletes: AthleteOption[]; excludedId?: string; onSelect?: (id: string) => void; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AthleteOption | null>(null);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const term = normalizeAthleteSearch(query.trim());
    return athletes.filter((athlete) => athlete.id !== excludedId && (!term || normalizeAthleteSearch(athlete.name).includes(term))).slice(0, 8);
  }, [athletes, excludedId, query]);

  return <div className={cx(`${viewStyles.field_category_athlete_search}${compact ? " category-athlete-search-compact" : ""}`)}>
    {!compact ? <label htmlFor={id}>{label}</label> : null}
    <input name={name} type="hidden" value={selected?.id ?? ""} />
    <input id={id} className="category-athlete-search-input" value={query} placeholder={compact ? label : "Pesquisar atleta"} aria-label={label} autoComplete="off" required onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setSelected(null); onSelect?.(""); setOpen(true); }} />
    {open ? <div className={viewStyles.category_athlete_search_results} role="listbox" aria-label={`Resultados para ${label}`}>
      {matches.length ? matches.map((athlete) => <button key={athlete.id} type="button" role="option" aria-selected={selected?.id === athlete.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setSelected(athlete); setQuery(athlete.name); onSelect?.(athlete.id); setOpen(false); }}>{athlete.name}</button>) : <span>Nenhum atleta encontrado.</span>}
    </div> : null}
  </div>;
}

export function CategoryPairForm({ competitionId, athletes }: { competitionId: string; athletes: AthleteOption[] }) {
  const [firstPlayerId, setFirstPlayerId] = useState("");
  const [secondPlayerId, setSecondPlayerId] = useState("");

  return <SafeActionForm action={addManualPairAction} className={viewStyles.grid_form_category_pair_form} successMessage="Dupla adicionada com sucesso." resetOnSuccess>
    <input type="hidden" name="competitionId" value={competitionId} />
    <AthleteSearchField id={`first-player-${competitionId}`} label="Primeiro atleta" name="firstPlayerId" athletes={athletes} excludedId={secondPlayerId} onSelect={setFirstPlayerId} />
    <AthleteSearchField id={`second-player-${competitionId}`} label="Segundo atleta" name="secondPlayerId" athletes={athletes} excludedId={firstPlayerId} onSelect={setSecondPlayerId} />
    <div className={viewStyles.field_field_submit_category_pair_submit}><SubmitButton label="Adicionar dupla" pendingLabel="Adicionando..." className={viewStyles.button_button_primary} disabled={athletes.length < 2} /></div>
    {athletes.length < 2 ? <p className={viewStyles.muted_form_full}>Disponibilize ao menos dois atletas ativos, elegíveis e ainda sem dupla nesta categoria em <Link href="/players">Gestão → Atletas</Link>.</p> : null}
  </SafeActionForm>;
}
