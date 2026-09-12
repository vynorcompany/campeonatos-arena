"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createSuper12Action } from "@/lib/actions/public-super12";

export function PublicSuper12Create({ arenaSlug, athletes, defaultOpen = false }: { arenaSlug: string; athletes: Array<{ id: string; name: string; photoUrl: string }>; defaultOpen?: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<"ROUND_ROBIN" | "GROUPS">("ROUND_ROBIN");
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 12 ? current : [...current, id]);

  return <details className="super12-create" open={defaultOpen}>
    <summary><span>CRIAR SUPER 12</span><strong>Monte uma rodada avulsa</strong><small>Duplas fixas, jogos automáticos e classificação ao vivo.</small></summary>
    <SafeActionForm action={createSuper12Action} successMessage="Super 12 criado. A rodada já está pronta para começar." className="super12-create-form" resetOnSuccess>
      <input type="hidden" name="arenaSlug" value={arenaSlug} />
      {selected.map((id) => <input type="hidden" key={id} name="playerIds" value={id} />)}
      <label>Nome da rodada<input name="name" required minLength={3} placeholder="Ex.: Super 12 de sexta" /></label>
      <label>Formato<select name="format" value={format} onChange={(event) => setFormat(event.target.value as "ROUND_ROBIN" | "GROUPS")}><option value="ROUND_ROBIN">Todos contra todos</option><option value="GROUPS">Grupos</option></select></label>
      {format === "GROUPS" ? <label>Quantidade de grupos<select name="groupCount" defaultValue="2"><option value="2">2 grupos</option><option value="3">3 grupos</option></select></label> : <input type="hidden" name="groupCount" value="2" />}
      <section className="super12-selector"><div><strong>Participantes</strong><span>{selected.length}/12 atletas · {selected.length ? `${selected.length / 2} dupla${selected.length === 2 ? "" : "s"}` : "selecione de 4 a 12"}</span></div><p>Os atletas serão pareados pela ordem de seleção. Cada um receberá um aviso no Portal.</p><div className="super12-athlete-options">{athletes.map((athlete) => <label key={athlete.id} className={selected.includes(athlete.id) ? "selected" : ""}><input type="checkbox" checked={selected.includes(athlete.id)} onChange={() => toggle(athlete.id)} /><span>{athlete.photoUrl ? <img src={athlete.photoUrl} alt="" /> : athlete.name.slice(0, 2).toUpperCase()}</span>{athlete.name}</label>)}</div></section>
      <div className="super12-create-actions"><SubmitButton label="Montar jogos" pendingLabel="Montando rodada..." className="button button-primary" /><small>Os resultados desta rodada não entram no ranking ou no histórico da Liga.</small></div>
    </SafeActionForm>
  </details>;
}
