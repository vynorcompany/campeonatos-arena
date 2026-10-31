"use client";
import { arenaDateInput } from "@/lib/calendar/arena-wall-clock";
import { viewStyles } from "./new-command-modal.utilities";

import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";

type PlayerOption = { id: string; name: string };

export function NewCommandModal({ players, closeHref, action, cardsEnabled = false }: { cardsEnabled?: boolean; players: PlayerOption[]; closeHref: string; action: (formData: FormData) => Promise<unknown> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectionLock = useRef(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const opening = isPending || selectedPlayerId !== null;
  const [query, setQuery] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const matchingPlayers = useMemo(() => players.filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))).slice(0, 12), [players, query]);

  const closeDialog = useCallback(() => {
    if (!selectionLock.current) router.push(closeHref);
  }, [closeHref, router]);

  function selectClient(playerId: string) {
    if (!playerId || selectionLock.current) return;
    selectionLock.current = true;
    setSelectedPlayerId(playerId);
    setError(null);
    const formData = new FormData();
    formData.set("type", "CLIENT");
    formData.set("playerId", playerId);
    if (cardsEnabled && cardNumber.trim()) formData.set("cardNumber", cardNumber.trim());
    startTransition(async () => {
      try {
        const result = await action(formData);
        const openedAt = result && typeof result === "object" && "openedAt" in result && typeof result.openedAt === "string" ? result.openedAt : null;
        const destination = new URL(closeHref, window.location.origin);
        const comandaId = result && typeof result === "object" && "comandaId" in result && typeof result.comandaId === "string" ? result.comandaId : null;
        if (!comandaId) throw new Error("Não foi possível identificar a comanda aberta.");
        destination.searchParams.delete("ids");
        destination.searchParams.delete("search");
        if (openedAt) destination.searchParams.set("date", arenaDateInput(new Date(openedAt)));
        router.push(`${destination.pathname}${destination.search}`);
        router.refresh();
      } catch (caughtError) {
        selectionLock.current = false;
        setSelectedPlayerId(null);
        setError(caughtError instanceof Error ? caughtError.message : "Não foi possível abrir a comanda.");
      }
    });
  }

  return <Modal title="Nova comanda" open onClose={closeDialog} width="tw:max-w-[440px]">
    <div className="commands-new-modal tw:grid tw:gap-3">
      <p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">A comanda será aberta ao selecionar um cliente.</p>
      {cardsEnabled ? <label className={viewStyles.field}>Número do cartão de comanda<input value={cardNumber} onChange={event => setCardNumber(event.currentTarget.value)} maxLength={40} pattern="[A-Za-z0-9_-]+" placeholder="Opcional · digite ou leia o cartão" disabled={opening}/></label> : null}
      <label className={viewStyles.field}>Buscar cliente<input value={query} onChange={(event) => setQuery(event.currentTarget.value)} disabled={opening} data-modal-autofocus placeholder="Digite o nome do cliente" /></label>
      <div className="tw:flex tw:items-center tw:justify-between tw:text-xs tw:font-semibold tw:text-[#607898]"><span>Clientes disponíveis</span><span>{matchingPlayers.length} exibidos</span></div><div className={viewStyles.commands_client_results} aria-label="Clientes encontrados">{matchingPlayers.map((player) => <button key={player.id} type="button" onClick={() => selectClient(player.id)} disabled={opening}><strong className="tw:min-w-0 tw:flex-1 tw:break-words">{player.name}</strong><span className="tw:text-[11px] tw:text-[var(--muted)]">{selectedPlayerId === player.id ? "Abrindo…" : "Selecionar"}</span></button>)}{!matchingPlayers.length ? <p>{query.trim() ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}</p> : null}</div>
      {error ? <p className={viewStyles.form_error} role="alert">{error}</p> : null}
    </div>
  </Modal>;
}
