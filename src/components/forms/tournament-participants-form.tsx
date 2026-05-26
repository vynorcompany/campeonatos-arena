"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createManualTournamentRegistrationAction, deleteTournamentRegistrationAction, syncEntriesStateAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

type TournamentParticipantsFormProps = {
  tournamentId: string;
  categories?: Array<{ id: string; name: string }>;
  registrations?: Array<{
    id: string;
    leadName: string;
    partnerName: string;
    categoryName: string;
    amountCents: number;
    paymentStatus: string;
    status: string;
    createdAt: string;
  }>;
  players?: Array<{
    id: string;
    name: string;
    points: number;
    checked: boolean;
  }>;
};

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountCents / 100);
}

function getPaymentLabel(paymentStatus: string) {
  return paymentStatus === "PAID" ? "Pago" : "Nao pago";
}

function getConfirmationLabel(paymentStatus: string) {
  return paymentStatus === "PAID" ? "Confirmado" : "Nao confirmado";
}

export function TournamentParticipantsForm(props: TournamentParticipantsFormProps) {
  const { tournamentId, categories, registrations, players } = props;
  const [state, formAction] = useFormState(createManualTournamentRegistrationAction, initialState);
  const [syncState, syncAction] = useFormState(syncEntriesStateAction, initialState);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(() => new Set((players ?? []).filter((player) => player.checked).map((player) => player.id)));

  const filtered = useMemo(() => {
    if (!registrations) return [];
    if (!normalizedSearch) return registrations;
    return registrations.filter((item) => {
      const blob = `${item.leadName} ${item.partnerName} ${item.categoryName}`.toLowerCase();
      return blob.includes(normalizedSearch);
    });
  }, [normalizedSearch, registrations]);

  if (players) {
    return (
      <form action={syncAction} className="stack-md">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <div className="participant-grid">
          {players.map((player) => (
            <label key={player.id} className="participant-option">
              <input
                type="checkbox"
                name="playerIds"
                value={player.id}
                checked={selectedPlayerIds.has(player.id)}
                onChange={(event) => {
                  setSelectedPlayerIds((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(player.id);
                    else next.delete(player.id);
                    return next;
                  });
                }}
              />
              <div className="participant-copy">
                <strong>{player.name}</strong>
                <span>{player.points} pts</span>
              </div>
            </label>
          ))}
        </div>
        <div className="section-actions">
          <SubmitButton label="Salvar participantes" pendingLabel="Salvando..." className="button button-primary" />
        </div>
        {syncState?.error ? <p className="form-error">{syncState.error}</p> : null}
        {syncState?.success ? <p className="form-success">{syncState.success}</p> : null}
      </form>
    );
  }

  const safeCategories = categories ?? [];
  const safeFiltered = filtered ?? [];

  return (
    <div className="stack-md">
      <article className="section-card">
        <h3>Inscrever dupla manualmente</h3>
        <form action={formAction} className="grid-form">
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <div className="field">
            <label htmlFor="categoryId">Categoria</label>
            <select id="categoryId" name="categoryId" required>
              {safeCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="leadName">Atleta 1</label>
            <input id="leadName" name="leadName" required />
          </div>
          <div className="field">
            <label htmlFor="leadPhone">Telefone atleta 1</label>
            <input id="leadPhone" name="leadPhone" required />
          </div>
          <div className="field">
            <label htmlFor="leadCpf">CPF atleta 1</label>
            <input id="leadCpf" name="leadCpf" required />
          </div>
          <div className="field">
            <label htmlFor="leadBirthDate">Nascimento atleta 1</label>
            <input id="leadBirthDate" name="leadBirthDate" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="partnerName">Atleta 2</label>
            <input id="partnerName" name="partnerName" required />
          </div>
          <div className="field">
            <label htmlFor="partnerPhone">Telefone atleta 2</label>
            <input id="partnerPhone" name="partnerPhone" required />
          </div>
          <div className="field">
            <label htmlFor="partnerCpf">CPF atleta 2</label>
            <input id="partnerCpf" name="partnerCpf" required />
          </div>
          <div className="field">
            <label htmlFor="partnerBirthDate">Nascimento atleta 2</label>
            <input id="partnerBirthDate" name="partnerBirthDate" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="amountReais">Valor (R$)</label>
            <input id="amountReais" name="amountReais" type="text" placeholder="Ex.: 150,00" required />
          </div>
          <div className="field">
            <label htmlFor="paymentStatus">Pagamento</label>
            <select id="paymentStatus" name="paymentStatus" defaultValue="PENDING">
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
            </select>
          </div>
          <div className="field field-submit">
            <SubmitButton label="Inscrever manualmente" pendingLabel="Salvando..." className="button button-primary" />
          </div>
          {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
          {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
        </form>
      </article>

      <article className="section-card">
        <h3>Inscritos pelo link e manuais</h3>
        <div className="field">
          <label htmlFor="participant-search">Buscar inscrito</label>
          <input id="participant-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, dupla ou categoria" />
        </div>
        {!safeFiltered.length ? (
          <p className="muted">Nenhuma inscricao encontrada.</p>
        ) : (
          <div className="simple-list">
            {safeFiltered.map((registration) => {
              const paid = registration.paymentStatus === "PAID";
              return (
                <div key={registration.id} className="simple-item" style={{ alignItems: "flex-start", gap: "0.5rem" }}>
                  <div className="stack-xs" style={{ width: "100%" }}>
                    <strong>{registration.leadName} / {registration.partnerName}</strong>
                    <span className="muted">
                      {registration.categoryName} · {formatCurrency(registration.amountCents)} · {new Date(registration.createdAt).toLocaleString("pt-BR")}
                    </span>
                    <div className="field-inline" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className={`player-status-pill${paid ? "" : " player-status-pill-inactive"}`}>
                        Pagamento: {getPaymentLabel(registration.paymentStatus)}
                      </span>
                      <span className={`player-status-pill${paid ? "" : " player-status-pill-inactive"}`}>
                        Situacao: {getConfirmationLabel(registration.paymentStatus)}
                      </span>
                      <form action={deleteTournamentRegistrationAction}>
                        <input type="hidden" name="registrationId" value={registration.id} />
                        <SubmitButton label="Excluir participante" pendingLabel="Excluindo..." className="button" />
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}
