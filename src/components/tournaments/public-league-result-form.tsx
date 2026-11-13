"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordOwnLeagueMatchResultAction } from "@/lib/actions/league-challenges";
import { viewStyles } from "./public-league-portal.utilities";

export function PublicLeagueResultForm({ arenaSlug, matchId, homeName, awayName, onSaved }: {
  arenaSlug: string; matchId: string; homeName: string; awayName: string;
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (feedback) feedbackRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [feedback]);

  return <form className={`${viewStyles.public_league_result_form} tw:min-w-0 tw:[&>strong]:whitespace-normal! tw:[&>strong]:overflow-visible! tw:[&>strong]:break-words tw:[&>strong]:text-xs! tw:[&_small]:text-xs! tw:[&_small]:leading-relaxed tw:[&_input]:border-[#718bac]! tw:[&_input]:bg-[var(--portal-surface,#fff)] tw:[&_input]:text-[var(--portal-ink,#172d4c)] tw:[&_input]:text-sm tw:[&_input]:focus-visible:outline-2 tw:[&_input]:focus-visible:outline-offset-1 tw:[&_input]:focus-visible:outline-[#205da8]`} onSubmit={(event) => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setFeedback(null);
    startTransition(async () => {
      try {
        const saved = await recordOwnLeagueMatchResultAction(data);
        if (!saved.success) {
          setFeedback({ success: false, text: saved.error });
          return;
        }
        if (saved.matchId !== matchId || saved.homeScore == null || saved.awayScore == null) {
          throw new Error("Não foi possível confirmar a gravação. Tente novamente.");
        }
        onSaved(`Resultado salvo: ${homeName} ${saved.homeScore} × ${saved.awayScore} ${awayName}. A dupla visitante foi notificada.`);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        // Production Server Action errors omit their details; always offer a useful fallback.
        const expected = /^(Informe |Uma dupla |Somente a dupla |Jogo de Liga inválido|O terceiro set|Não foi possível confirmar)/.test(message);
        setFeedback({ success: false, text: expected ? message : "Não foi possível salvar o resultado. Seus valores continuam aqui; tente novamente ou avise a arena." });
      }
    });
  }}>
    <input type="hidden" name="arenaSlug" value={arenaSlug} />
    <input type="hidden" name="matchId" value={matchId} />
    <span>Set</span><strong>{homeName}</strong><strong>{awayName}</strong>
    {[["homeSet1", "awaySet1", "1"], ["homeSet2", "awaySet2", "2"], ["homeSet3", "awaySet3", "3"]].map(([home, away, set]) =>
      <span className={viewStyles.public_league_result_score} key={set}>
        <i>{set}</i>
        <input name={home} type="number" min="0" required={set !== "3"} aria-label={`Set ${set} de ${homeName}`} />
        <input name={away} type="number" min="0" required={set !== "3"} aria-label={`Set ${set} de ${awayName}`} />
      </span>,
    )}
    <small>Informe os dois primeiros sets; o terceiro é apenas para desempate.</small>
    <button type="submit" className={viewStyles.button_button_primary} disabled={pending}>{pending ? "Salvando..." : "Salvar resultado"}</button>
    {feedback ? <p ref={feedbackRef} role={feedback.success ? "status" : "alert"} className={`tw:col-span-full tw:min-w-0 tw:m-0 tw:break-words tw:rounded-md tw:border tw:px-3 tw:py-2 tw:text-sm ${feedback.success ? "tw:border-[#99cfb3] tw:bg-[#edf9f2] tw:text-[#14532d]" : "tw:border-[#e4a3a3] tw:bg-[#fff1f1] tw:text-[#8a1616]"}`}>{feedback.text}</p> : null}
  </form>;
}
