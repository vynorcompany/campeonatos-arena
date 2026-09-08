"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type PlayerOption = { id: string; name: string };

export function NewCommandModal({ players, closeHref, action }: { players: PlayerOption[]; closeHref: string; action: (formData: FormData) => Promise<unknown> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const matchingPlayers = useMemo(() => players.filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))).slice(0, 12), [players, query]);

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
      <label className="field">Buscar cliente<input value={query} onChange={(event) => setQuery(event.currentTarget.value)} disabled={isPending} autoFocus placeholder="Digite o nome do cliente" /></label>
      <div className="commands-client-results" role="listbox" aria-label="Clientes encontrados">{matchingPlayers.map((player) => <button key={player.id} type="button" onClick={() => selectClient(player.id)} disabled={isPending}><strong>{player.name}</strong><span>Selecionar cliente</span></button>)}{query.trim() && !matchingPlayers.length ? <p>Nenhum cliente encontrado.</p> : null}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  </div>;
}
