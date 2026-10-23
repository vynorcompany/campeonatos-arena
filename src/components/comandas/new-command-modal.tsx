"use client";
import { viewStyles } from "./new-command-modal.utilities";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type PlayerOption = { id: string; name: string };

export function NewCommandModal({ players, closeHref, action }: { players: PlayerOption[]; closeHref: string; action: (formData: FormData) => Promise<unknown> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const matchingPlayers = useMemo(() => players.filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))).slice(0, 12), [players, query]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || isPending) return;
      event.preventDefault();
      router.push(closeHref);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeHref, isPending, router]);

  function selectClient(playerId: string) {
    if (!playerId) return;
    setError(null);
    const formData = new FormData();
    formData.set("type", "CLIENT");
    formData.set("playerId", playerId);
    startTransition(async () => {
      try {
        const result = await action(formData);
        const openedAt = result && typeof result === "object" && "openedAt" in result && typeof result.openedAt === "string" ? result.openedAt : null;
        const destination = new URL(closeHref, window.location.origin);
        if (openedAt) destination.searchParams.set("date", openedAt.slice(0, 10));
        router.push(`${destination.pathname}${destination.search}`);
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Não foi possível abrir a comanda.");
      }
    });
  }

  return <div className={viewStyles.commands_new_modal_backdrop} role="presentation" onMouseDown={() => !isPending && router.push(closeHref)}>
    <section className={viewStyles.commands_new_modal + " tw:border-t-4! tw:border-t-[#0868e5]! tw:[&_h2]:text-2xl! tw:[&_h2]:tracking-tight tw:[&_header]:pb-5!"} role="dialog" aria-modal="true" aria-labelledby="commands-new-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>NOVA COMANDA</span><h2 id="commands-new-modal-title">Selecione o cliente</h2><p>A comanda será aberta ao selecionar um cliente.</p></div><button type="button" className={viewStyles.commands_modal_close} onClick={() => router.push(closeHref)} disabled={isPending} aria-label="Fechar">×</button></header>
      <label className={viewStyles.field}>Buscar cliente<input value={query} onChange={(event) => setQuery(event.currentTarget.value)} disabled={isPending} autoFocus placeholder="Digite o nome do cliente" /></label>
      <div className="tw:flex tw:items-center tw:justify-between tw:text-xs tw:font-semibold tw:text-[#607898]"><span>Clientes disponíveis</span><span>{matchingPlayers.length} exibidos</span></div><div className={viewStyles.commands_client_results} aria-label="Clientes encontrados">{matchingPlayers.map((player) => <button key={player.id} type="button" onClick={() => selectClient(player.id)} disabled={isPending}><span aria-hidden="true" className="tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-[#eaf2ff] tw:font-bold tw:text-[#0754c3]">{player.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><strong className="tw:min-w-0 tw:flex-1 tw:break-words">{player.name}</strong><span aria-hidden="true">↗</span></button>)}{query.trim() && !matchingPlayers.length ? <p>Nenhum cliente encontrado.</p> : null}</div>
      {error ? <p className={viewStyles.form_error} role="alert">{error}</p> : null}
    </section>
  </div>;
}
