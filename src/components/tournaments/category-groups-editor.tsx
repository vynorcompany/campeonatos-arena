"use client";

import { useId, useRef, useState, useTransition, type ReactNode, type PointerEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { saveCategoryGroupsAction } from "@/lib/actions/category-group-editing";
import { viewStyles } from "./category-draw-panel.utilities";
import { tournamentWorkspace as ui } from "./tournament-workspace";

type Group = { id: string; name: string; pairs: { id: string; name: string }[] };
const copy = (groups: Group[]) => groups.map(group => ({ ...group, pairs: [...group.pairs] }));
const payload = (groups: Group[]) => groups.map(group => ({ id: group.id, pairIds: group.pairs.map(pair => pair.id) }));
function Grip() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="tw:size-4" fill="currentColor">{[6,12,18].flatMap(y=>[9,15].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="1.6"/>))}</svg>; }

export function CategoryGroupsEditor({ competitionId, groups, league, trio, groupIcon, pairIcon }: { competitionId: string; groups: Group[]; league: boolean; trio: boolean; groupIcon?: ReactNode; pairIcon?: ReactNode }) {
  const router = useRouter();
  const instructionsId = useId();
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ key: string; pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => copy(groups));
  const [expected, setExpected] = useState(() => payload(groups));
  const [picked, setPicked] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const shown = editing ? draft : groups;
  const dirty = JSON.stringify(payload(draft)) !== JSON.stringify(expected);

  function drop(source: string, target: string) {
    if (source === target) { setPicked(null); setOver(null); return; }
    const [kind, groupIndex, pairIndex] = source.split(":");
    const [targetKind, targetGroupIndex, targetPairIndex] = target.split(":");
    if (kind !== targetKind) return;
    const from = Number(groupIndex), to = Number(targetGroupIndex);
    const next = copy(draft);
    if (kind === "group") {
      const [group] = next.splice(from, 1); next.splice(to, 0, group);
      setAnnouncement(`${group.name} movido para a posição ${to + 1}.`);
    } else {
      const a = Number(pairIndex), b = Number(targetPairIndex);
      const pair = next[from].pairs[a];
      if (from === to) { next[from].pairs.splice(a, 1); next[to].pairs.splice(b, 0, pair); }
      else { next[from].pairs[a] = next[to].pairs[b]; next[to].pairs[b] = pair; }
      setAnnouncement(`${pair.name} movido para ${next[to].name}, posição ${b + 1}.`);
    }
    setDraft(next); setPicked(null); setOver(null);
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(`button[data-drag-key="${target}"]`)?.focus());
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>, key: string, name: string) {
    if (event.key === "Escape") { event.preventDefault(); pointer.current = null; setPicked(null); setOver(null); setAnnouncement("Movimentação cancelada."); return; }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (picked) drop(picked, key);
      else { setPicked(key); setOver(key); setAnnouncement(`${name} selecionado. Use as setas para escolher o destino e Enter para confirmar.`); }
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const kind = key.split(":")[0];
    const handles = Array.from(root.current?.querySelectorAll<HTMLButtonElement>(`button[data-drag-key^="${kind}:"]`) ?? []);
    const index = handles.indexOf(event.currentTarget);
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? handles.length - 1 : Math.max(0, Math.min(handles.length - 1, index + (["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1)));
    handles[nextIndex]?.focus(); if (picked) setOver(handles[nextIndex]?.dataset.dragKey ?? null);
  }

  function handle(key: string, name: string) {
    return <button type="button" data-drag-key={key} aria-label={`Mover ${name}`} data-tooltip={`Arrastar ${name}`} aria-describedby={instructionsId} aria-pressed={picked === key} disabled={pending} className="tw:inline-flex tw:size-8 tw:shrink-0 tw:touch-none tw:cursor-grab tw:items-center tw:justify-center tw:rounded tw:border-0 tw:bg-transparent tw:text-current tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#1e5ea8] tw:active:cursor-grabbing" onKeyDown={event=>keyboard(event,key,name)} onPointerDown={event=>{
      if (event.button !== 0 || pointer.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      pointer.current = { key, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      setPicked(key); setOver(key);
    }} onPointerMove={(event: PointerEvent<HTMLButtonElement>)=>{
      const active = pointer.current; if (!active || active.pointerId !== event.pointerId) return;
      if (Math.abs(event.clientX-active.x)+Math.abs(event.clientY-active.y)>5) active.moved = true;
      const target = document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-drop-key]");
      const keyAtPoint = target?.dataset.dropKey;
      if (keyAtPoint?.split(":")[0] === active.key.split(":")[0]) setOver(keyAtPoint);
      if(event.clientY>window.innerHeight-55) window.scrollBy(0,18); else if(event.clientY<65) window.scrollBy(0,-18);
    }} onPointerUp={event=>{
      const active = pointer.current; if (!active || active.pointerId !== event.pointerId) return; pointer.current = null;
      if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      const target = document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-drop-key]")?.dataset.dropKey;
      if(active?.moved && target && active.key.split(":")[0] === target.split(":")[0]) drop(active.key,target); else {setPicked(null);setOver(null);}
    }} onPointerCancel={event=>{if(pointer.current?.pointerId===event.pointerId){pointer.current=null;setPicked(null);setOver(null);}}} onLostPointerCapture={event=>{if(pointer.current?.pointerId===event.pointerId){pointer.current=null;setPicked(null);setOver(null);}}}><Grip/></button>;
  }

  return <div ref={root} className="tw:grid tw:min-w-0 tw:gap-3">
    <p id={instructionsId} className="tw:sr-only">Arraste pelo ícone para reordenar. Entre grupos, os participantes trocam de lugar. Pelo teclado, pressione Enter ou Espaço, use as setas e confirme com Enter. Escape cancela.</p>
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{editing ? <><button type="button" className={ui.success} disabled={!dirty || pending || !!picked} onClick={()=>{setError("");startTransition(async()=>{try {const result=await saveCategoryGroupsAction({competitionId,expectedGroups:expected,groups:payload(draft)});if(!result.success){setError(result.error);return;}setEditing(false);setAnnouncement("Grupos atualizados.");router.refresh();}catch{setError("Não foi possível salvar os grupos. Tente novamente.");}});}}>{pending ? "Salvando…" : "Salvar alterações"}</button><button type="button" className={ui.secondary} disabled={pending} onClick={()=>{setDraft(copy(groups));setEditing(false);setPicked(null);setOver(null);setError("");setAnnouncement("Edição cancelada.");}}>Cancelar</button></> : <button type="button" className={ui.primary} onClick={()=>{setDraft(copy(groups));setExpected(payload(groups));setEditing(true);setError("");}}>Editar grupos</button>}</div>
    <p role="status" aria-live="polite" className="tw:sr-only">{announcement}</p>
    {error ? <p role="alert" className="tw:m-0 tw:text-xs tw:text-[#a02119]">{error}</p> : null}
    <div className={`simple-grid simple-grid-2 tw:grid tw:min-w-0 tw:gap-3 ${league ? viewStyles.league_groups_list : "tw:min-[900px]:grid-cols-2"}`}>
      {shown.map((group,g)=><section key={group.id} className={`${viewStyles.section_card} ${league ? viewStyles.league_group_card : ""} ${over===`group:${g}` ? "tw:outline-2 tw:outline-offset-2 tw:outline-[#1e5ea8]" : ""}`}>
        <div data-drop-key={`group:${g}`} className={`${league ? viewStyles.league_group_card_heading : ""} tw:flex tw:min-w-0 tw:items-center tw:gap-2`}>
          {league ? <span className={viewStyles.league_group_icon}>{groupIcon}</span> : null}<div className="tw:min-w-0 tw:flex-1"><h4>{group.name}</h4><p className={viewStyles.muted}>{group.pairs.length} {trio ? "trios" : "duplas"}</p></div>{editing ? handle(`group:${g}`,group.name) : null}
        </div>
        <div className={`${viewStyles.simple_list} ${league ? viewStyles.league_group_pair_list : ""}`}>
          {group.pairs.map((pair,p)=><div key={pair.id} data-drop-key={`pair:${g}:${p}`} className={`${viewStyles.simple_item} ${league ? viewStyles.league_group_pair : ""} tw:flex! tw:flex-nowrap! tw:min-w-0 tw:items-center tw:gap-2 ${over===`pair:${g}:${p}` ? "tw:outline-2 tw:-outline-offset-2 tw:outline-[#1e5ea8]" : ""}`}>
            {league ? <span className={viewStyles.league_group_pair_icon}>{pairIcon}</span> : null}<strong className="tw:min-w-0 tw:flex-1 tw:break-words">{pair.name}</strong>{editing ? handle(`pair:${g}:${p}`,pair.name) : null}
          </div>)}
        </div>
      </section>)}
    </div>
  </div>;
}
