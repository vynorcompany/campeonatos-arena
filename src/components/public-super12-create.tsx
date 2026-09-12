"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createSuper12Action } from "@/lib/actions/public-super12";

export function PublicSuper12Create({ arenaSlug, athletes }: { arenaSlug: string; athletes: Array<{ id: string; name: string; photoUrl: string }> }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<"ROUND_ROBIN" | "GROUPS">("ROUND_ROBIN");
  const [search, setSearch] = useState("");
  const selectedAthletes = selected.map((id) => athletes.find((athlete) => athlete.id === id)).filter((athlete): athlete is { id: string; name: string; photoUrl: string } => Boolean(athlete));
  const matches = search.trim() && selected.length < 24 ? athletes.filter((athlete) => !selected.includes(athlete.id) && athlete.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))).slice(0, 8) : [];
  const add = (id: string) => { if (selected.length < 24) setSelected((current) => [...current, id]); setSearch(""); };
  const remove = (id: string) => setSelected((current) => current.filter((item) => item !== id));

  return <details className="super12-create" onToggle={(event) => { if (event.currentTarget.open) router.refresh(); }}>
    <summary>Criar Super 12</summary>
    <SafeActionForm action={createSuper12Action} successMessage="Super 12 criado. A rodada já está pronta para começar." className="super12-create-form" resetOnSuccess>
      <input type="hidden" name="arenaSlug" value={arenaSlug} />
      {selected.map((id) => <input type="hidden" key={id} name="playerIds" value={id} />)}
      <label>Nome da rodada<input name="name" required minLength={3} placeholder="Ex.: Super 12 de sexta" /></label>
      <label>Formato<select name="format" value={format} onChange={(event) => setFormat(event.target.value as "ROUND_ROBIN" | "GROUPS")}><option value="ROUND_ROBIN">Todos contra todos</option><option value="GROUPS">Grupos</option></select></label>
      {format === "GROUPS" ? <label>Quantidade de grupos<select name="groupCount" defaultValue="2"><option value="2">2 grupos</option><option value="3">3 grupos</option></select></label> : <input type="hidden" name="groupCount" value="2" />}
      <section className="super12-selector"><div><strong>Participantes</strong><span>{selected.length}/24 atletas · {selected.length ? `${selected.length / 2} dupla${selected.length === 2 ? "" : "s"}` : "selecione de 2 a 12 duplas"}</span></div><p>Pesquise pelo nome para adicionar. As duplas são formadas na ordem de seleção e cada atleta recebe um aviso no Portal.</p><label className="super12-player-search">Buscar atleta<input value={search} onFocus={() => router.refresh()} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o nome do atleta" autoComplete="off" />{matches.length ? <div role="listbox">{matches.map((athlete) => <button type="button" key={athlete.id} onClick={() => add(athlete.id)}><span>{athlete.photoUrl ? <img src={athlete.photoUrl} alt="" /> : athlete.name.slice(0, 2).toUpperCase()}</span>{athlete.name}<small>Adicionar</small></button>)}</div> : null}</label><div className="super12-selected-athletes">{selectedAthletes.length ? selectedAthletes.map((athlete, index) => <button type="button" key={athlete.id} onClick={() => remove(athlete.id)} title="Remover participante"><span>{athlete.photoUrl ? <img src={athlete.photoUrl} alt="" /> : athlete.name.slice(0, 2).toUpperCase()}</span><b>{athlete.name}</b><small>Dupla {Math.floor(index / 2) + 1} · remover</small></button>) : <span>Nenhum participante adicionado.</span>}</div></section>
      <div className="super12-create-actions"><SubmitButton label="Montar jogos" pendingLabel="Montando rodada..." className="button button-primary" /><small>Os resultados desta rodada não entram no ranking ou no histórico da Liga.</small></div>
    </SafeActionForm>
  </details>;
}
