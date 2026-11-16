"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./category-pair-form.utilities";

import { Modal } from "@/components/ui/modal";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { addManualPairAction } from "@/lib/actions/category-competition";
import { searchAthleteOptions } from "@/lib/tournament-category/athlete-search";

type AthleteOption = { id: string; name: string };

export function AthleteSearchField({ id, label, name, athletes, excludedId, excludedIds, onSelect, compact = false }: { id: string; label: string; name: string; athletes: AthleteOption[]; excludedId?: string; excludedIds?: string[]; onSelect?: (id: string) => void; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AthleteOption | null>(null);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    return searchAthleteOptions(athletes, query, excludedId).filter(athlete => !excludedIds?.includes(athlete.id));
  }, [athletes, excludedId, excludedIds, query]);

  return <div className={cx(`${viewStyles.field_category_athlete_search}${compact ? " category-athlete-search-compact" : ""}`)}>
    {!compact ? <label htmlFor={id}>{label}</label> : null}
    <input name={name} type="hidden" value={selected?.id ?? ""} />
    <input id={id} className="category-athlete-search-input" value={query} placeholder={compact ? label : "Pesquisar atleta"} aria-label={label} autoComplete="off" required onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setSelected(null); onSelect?.(""); setOpen(true); }} />
    {open ? <div className={viewStyles.category_athlete_search_results} role="listbox" aria-label={`Resultados para ${label}`}>
      {matches.length ? matches.map((athlete) => <button key={athlete.id} type="button" role="option" aria-selected={selected?.id === athlete.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setSelected(athlete); setQuery(athlete.name); onSelect?.(athlete.id); setOpen(false); }}>{athlete.name}</button>) : <span>Nenhum atleta encontrado.</span>}
    </div> : null}
  </div>;
}

export function CategoryPairForm({ competitionId, athletes, trio = false }: { competitionId: string; athletes: AthleteOption[]; trio?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => { setOpen(false); setFirstPlayerId(""); setSecondPlayerId(""); setThirdPlayerId(""); }, []);
  const [firstPlayerId, setFirstPlayerId] = useState("");
  const [secondPlayerId, setSecondPlayerId] = useState("");

  const [thirdPlayerId, setThirdPlayerId] = useState("");
  const minimum = trio ? 3 : 2;
  const label = trio ? "Adicionar trio" : "Adicionar dupla";
  return <><button type="button" className={viewStyles.button_button_primary} disabled={athletes.length < minimum} onClick={() => setOpen(true)}>{label}</button><Modal title={label} open={open} onClose={close} width="tw:max-w-[720px]" fixedSize={false} tone="management-strong"><SafeActionForm action={addManualPairAction} onSuccess={close} className={viewStyles.grid_form_category_pair_form} successMessage={trio ? "Trio adicionado com sucesso." : "Dupla adicionada com sucesso."} resetOnSuccess>
    <input type="hidden" name="competitionId" value={competitionId} />
    <AthleteSearchField id={`first-player-${competitionId}`} label="Primeiro atleta" name="firstPlayerId" athletes={athletes} excludedIds={[secondPlayerId, thirdPlayerId]} onSelect={setFirstPlayerId} />
    <AthleteSearchField id={`second-player-${competitionId}`} label="Segundo atleta" name="secondPlayerId" athletes={athletes} excludedIds={[firstPlayerId, thirdPlayerId]} onSelect={setSecondPlayerId} />
    {trio ? <AthleteSearchField id={`third-player-${competitionId}`} label="Terceiro atleta" name="thirdPlayerId" athletes={athletes} excludedIds={[firstPlayerId, secondPlayerId]} onSelect={setThirdPlayerId} /> : null}
    <div className={viewStyles.field_field_submit_category_pair_submit}><button type="button" className="tw:mr-2 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:px-3 tw:text-xs" onClick={close}>Cancelar</button><SubmitButton label={label} pendingLabel="Adicionando..." className={viewStyles.button_button_primary} disabled={athletes.length < minimum} /></div>
    {athletes.length < minimum ? <p className={viewStyles.muted_form_full}>Disponibilize ao menos {minimum} atletas ativos, elegíveis e ainda sem equipe nesta categoria em <Link href="/players">Gestão → Atletas</Link>.</p> : null}
  </SafeActionForm></Modal></>;
}
