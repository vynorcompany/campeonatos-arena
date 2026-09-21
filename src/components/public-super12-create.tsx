"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createSuper12Action } from "@/lib/actions/public-super12";

type Athlete = { id: string; name: string; photoUrl: string };

export function PublicSuper12Create({ arenaSlug, athletes }: { arenaSlug: string; athletes: Athlete[] }) {
  const router = useRouter();
  const [pairs, setPairs] = useState<string[][]>([[]]);
  const [targetPair, setTargetPair] = useState(0);
  const [format, setFormat] = useState<"ROUND_ROBIN" | "GROUPS">("ROUND_ROBIN");
  const [search, setSearch] = useState("");
  const selectedIds = useMemo(() => pairs.flat(), [pairs]);
  const pairCount = pairs.filter((pair) => pair.length === 2).length;
  const maximumGroups = Math.max(2, Math.min(12, Math.floor(pairCount / 2)));
  const available = search.trim() ? athletes.filter((athlete) => athlete.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")) && !selectedIds.includes(athlete.id)).slice(0, 8) : [];

  function addPair() {
    if (pairs.length >= 12) return;
    setPairs((current) => [...current, []]);
    setTargetPair(pairs.length);
  }

  function addAthlete(id: string) {
    if (selectedIds.includes(id) || selectedIds.length >= 24) return;
    let nextTarget = targetPair;
    if (!pairs[nextTarget] || pairs[nextTarget].length >= 2) nextTarget = pairs.findIndex((pair) => pair.length < 2);
    if (nextTarget < 0) {
      if (pairs.length >= 12) return;
      nextTarget = pairs.length;
      setPairs((current) => [...current, [id]]);
    } else {
      setPairs((current) => current.map((pair, index) => index === nextTarget ? [...pair, id] : pair));
    }
    setTargetPair(nextTarget);
    setSearch("");
  }

  function removeAthlete(pairIndex: number, athleteId: string) {
    setPairs((current) => {
      const next = current.map((pair, index) => index === pairIndex ? pair.filter((id) => id !== athleteId) : pair);
      return next.length > 1 && next[pairIndex]?.length === 0 ? next.filter((_, index) => index !== pairIndex) : next;
    });
    setTargetPair(Math.min(pairIndex, Math.max(pairs.length - 1, 0)));
  }

  return <details className="super12-create" onToggle={(event) => { if (event.currentTarget.open) router.refresh(); }}>
    <summary>Criar Super 12</summary>
    <SafeActionForm action={createSuper12Action} successMessage="Super 12 criado. A rodada já está pronta para começar." className="super12-create-form" resetOnSuccess>
      <input type="hidden" name="arenaSlug" value={arenaSlug} />
      <input type="hidden" name="pairs" value={JSON.stringify(pairs.filter((pair) => pair.length > 0))} />
      <label>Nome da rodada<input name="name" required minLength={3} placeholder="Ex.: Super 12 de sexta" /></label>
      <label>Formato<select name="format" value={format} onChange={(event) => setFormat(event.target.value as "ROUND_ROBIN" | "GROUPS")}><option value="ROUND_ROBIN">Todos contra todos</option><option value="GROUPS">Grupos + mata-mata</option></select></label>
      {format === "GROUPS" ? <label>Quantidade de grupos<input name="groupCount" type="number" min="2" max={maximumGroups} defaultValue="2" /></label> : <input type="hidden" name="groupCount" value="1" />}
      {format === "GROUPS" ? <label className="super12-knockout-rule">Classificação para o mata-mata<select name="knockoutQualification" defaultValue="TOP_TWO"><option value="TOP_TWO">Os 2 primeiros de cada grupo</option><option value="TOP_TWO_PLUS_BEST_THIRDS">2 primeiros + 2 melhores terceiros</option></select></label> : <input type="hidden" name="knockoutQualification" value="TOP_TWO" />}
      <section className="super12-selector">
        <header><div><strong>Monte as duplas</strong><span>{selectedIds.length}/24 atletas · {pairCount} dupla{pairCount === 1 ? "" : "s"} completa{pairCount === 1 ? "" : "s"}</span></div><button type="button" className="button button-small" onClick={addPair} disabled={pairs.length >= 12}>Nova dupla</button></header>
        <p>Escolha a dupla antes de buscar os atletas. Cada dupla deve ter duas pessoas para a rodada ser criada.</p>
        <label className="super12-player-search">Buscar atleta para a dupla selecionada<input value={search} onFocus={() => router.refresh()} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o nome do atleta" autoComplete="off" />{available.length ? <div role="listbox">{available.map((athlete) => <button type="button" key={athlete.id} onClick={() => addAthlete(athlete.id)}><span>{athlete.photoUrl ? <img src={athlete.photoUrl} alt="" /> : athlete.name.slice(0, 2).toUpperCase()}</span>{athlete.name}<small>Adicionar</small></button>)}</div> : null}</label>
        <div className="super12-pairs">{pairs.map((pair, pairIndex) => <section className={pairIndex === targetPair ? "is-target" : ""} key={`pair-${pairIndex}`}><button type="button" className="super12-pair-heading" onClick={() => setTargetPair(pairIndex)}><span>Dupla {pairIndex + 1}</span><small>{pair.length}/2 atletas</small></button><div>{[0, 1].map((slot) => { const athlete = pair[slot] ? athletes.find((item) => item.id === pair[slot]) : null; return athlete ? <button type="button" key={athlete.id} className="super12-pair-athlete" onClick={() => removeAthlete(pairIndex, athlete.id)} title="Remover da dupla"><span>{athlete.photoUrl ? <img src={athlete.photoUrl} alt="" /> : athlete.name.slice(0, 2).toUpperCase()}</span><b>{athlete.name}</b><small>Remover</small></button> : <button type="button" className="super12-pair-slot" key={`slot-${slot}`} onClick={() => setTargetPair(pairIndex)}>Adicionar atleta</button>; })}</div></section>)}</div>
      </section>
      <div className="super12-create-actions"><SubmitButton label="Montar jogos" pendingLabel="Montando rodada..." className="button button-primary" /><small>Os resultados desta rodada não entram no ranking ou no histórico da Liga.</small></div>
    </SafeActionForm>
  </details>;
}
