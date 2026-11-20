"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { tournamentWorkspace as ui } from "./tournament-workspace";
import { swapKnockoutParticipantsAction } from "@/lib/actions/knockout-reordering";

type Side = "home" | "away";
type Slot = { matchId: string; side: Side; pairId: string; pairName: string; matchLabel: string };

export function KnockoutSwapForm({ matchId, slots }: { matchId: string; slots: Slot[] }) {
  const router = useRouter();
  const [side, setSide] = useState<Side>(() => slots.find(slot => slot.matchId === matchId)?.side ?? "home");
  const [targetKey, setTargetKey] = useState("");
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const source = slots.find(slot => slot.matchId === matchId && slot.side === side);
  const targets = slots.filter(slot => slot.matchId !== matchId || slot.side !== side);
  const target = targets.find(slot => `${slot.matchId}:${slot.side}` === targetKey);

  return <details className="tw:col-span-full tw:min-w-0 tw:border-t tw:border-[var(--line)] tw:pt-3">
    <summary className="tw:w-fit tw:cursor-pointer tw:text-xs tw:text-[#174983] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#1e5ea8]">Trocar participantes</summary>
    <form className="tw:grid tw:min-w-0 tw:gap-3 tw:pt-3" onSubmit={event => {
      event.preventDefault();
      if (!source || !target || pending) return;
      setFeedback(null);
      startTransition(async () => {
        try {
          const result = await swapKnockoutParticipantsAction({ matchId, side, targetMatchId: target.matchId, targetSide: target.side, expectedPairId: source.pairId, expectedTargetPairId: target.pairId });
          if (!result.success) { setFeedback({ success: false, text: result.error }); return; }
          setFeedback({ success: true, text: "Participantes trocados." });
          setTargetKey("");
          router.refresh();
        } catch {
          setFeedback({ success: false, text: "Não foi possível trocar os participantes. Tente novamente." });
        }
      });
    }}>
      <div className="tw:grid tw:min-w-0 tw:gap-3 tw:min-[700px]:grid-cols-2">
        <label className={ui.field}><span>Participante deste jogo</span><SmartEntitySelect label="Participante deste jogo" value={side} disabled={pending} onChange={event => { setSide(event.target.value as Side); setTargetKey(""); setFeedback(null); }}>
          {slots.filter(slot => slot.matchId === matchId).map(slot => <option key={slot.side} value={slot.side}>{slot.pairName} · {slot.side === "home" ? "Mandante" : "Visitante"}</option>)}
        </SmartEntitySelect></label>
        <label className={ui.field}><span>Trocar com</span><SmartEntitySelect label="Trocar com" value={targetKey} disabled={pending} required onChange={event => { setTargetKey(event.target.value); setFeedback(null); }}>
          <option value="">Selecionar participante</option>
          {targets.map(slot => <option key={`${slot.matchId}:${slot.side}`} value={`${slot.matchId}:${slot.side}`}>{slot.matchLabel} · {slot.pairName} · {slot.side === "home" ? "Mandante" : "Visitante"}</option>)}
        </SmartEntitySelect></label>
      </div>
      {source && target ? <p className="tw:m-0 tw:break-words tw:text-xs tw:leading-relaxed" aria-live="polite"><strong className="tw:font-medium">{source.pairName}</strong> ({source.matchLabel}) ↔ <strong className="tw:font-medium">{target.pairName}</strong> ({target.matchLabel})</p> : null}
      <button type="submit" className={`${ui.primary} tw:w-fit`} disabled={pending || !source || !target}>{pending ? "Trocando…" : "Confirmar troca"}</button>
      {feedback ? <p role={feedback.success ? "status" : "alert"} className={`tw:m-0 tw:break-words tw:text-xs ${feedback.success ? "tw:text-[#14532d]" : "tw:text-[#a02119]"}`}>{feedback.text}</p> : null}
    </form>
  </details>;
}
