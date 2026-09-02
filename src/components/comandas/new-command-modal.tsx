"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PlayerOption = { id: string; name: string };

export function NewCommandModal({ players, closeHref, action }: { players: PlayerOption[]; closeHref: string; action: (formData: FormData) => Promise<unknown> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectClient(playerId: string) {
    if (!playerId) return;
    setError(null);
    const formData = new FormData();
    formData.set("type", "CLIENT");
    formData.set("playerId", playerId);
    startTransition(async () => {
      try {
        await action(formData);
        router.push(closeHref);
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Não foi possível abrir a comanda.");
      }
    });
  }

  return <div className="commands-new-modal-backdrop" role="presentation" onMouseDown={() => !isPending && router.push(closeHref)}>
    <section className="commands-new-modal" role="dialog" aria-modal="true" aria-labelledby="commands-new-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>NOVA COMANDA</span><h2 id="commands-new-modal-title">Selecione o cliente</h2><p>A comanda será aberta ao selecionar um cliente.</p></div><button type="button" className="commands-modal-close" onClick={() => router.push(closeHref)} disabled={isPending} aria-label="Fechar">×</button></header>
      <label className="field">Cliente<select name="playerId" defaultValue="" onChange={(event) => selectClient(event.currentTarget.value)} disabled={isPending} autoFocus><option value="" disabled>{isPending ? "Abrindo comanda..." : "Selecione um cliente"}</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  </div>;
}
