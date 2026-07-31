"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  createManualTournamentRegistrationAction,
  deleteTournamentRegistrationAction,
  updateTournamentRegistrationAction,
  type ActionState
} from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

type TournamentParticipantsFormProps = {
  tournamentId: string;
  categories?: Array<{ id: string; name: string }>;
  registrations?: Array<{
    id: string;
    categoryId: string;
    leadName: string;
    leadPhone: string;
    leadCpf: string;
    leadBirthDate: string;
    partnerName: string;
    partnerPhone: string;
    partnerCpf: string;
    partnerBirthDate: string;
    categoryName: string;
    amountCents: number;
    paymentStatus: string;
    status: string;
    createdAt: string;
  }>;
  players?: Array<{
    id: string;
    name: string;
    phone: string;
    cpf: string;
    birthDate: string | null;
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
  const [updateState, updateAction] = useFormState(updateTournamentRegistrationAction, initialState);
  const [search, setSearch] = useState("");
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!registrations) return [];
    if (!normalizedSearch) return registrations;
    return registrations.filter((item) => {
      const blob = `${item.leadName} ${item.partnerName} ${item.categoryName}`.toLowerCase();
      return blob.includes(normalizedSearch);
    });
  }, [normalizedSearch, registrations]);

  const safeCategories = categories ?? [];
  const eligiblePlayers = (players ?? []).filter((player) => player.phone && /^\d{11}$/.test(player.cpf) && player.birthDate);
  const safeFiltered = filtered ?? [];

  return (
    <div className="stack-md">
      <article className="section-card">
        <h3>Inscrever dupla manualmente</h3>
        {!eligiblePlayers.length ? (
          <p className="muted">Nenhum atleta ativo possui os dados completos. Atualize telefone, CPF e nascimento em <a href="/jogadores">Atletas</a>.</p>
        ) : (
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
            <label htmlFor="leadPlayerId">Atleta 1</label>
            <select id="leadPlayerId" name="leadPlayerId" required>
              <option value="">Selecione um atleta</option>
              {eligiblePlayers.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="partnerPlayerId">Atleta 2</label>
            <select id="partnerPlayerId" name="partnerPlayerId" required>
              <option value="">Selecione um atleta</option>
              {eligiblePlayers.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
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
        )}
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
                    <div className="section-actions" style={{ gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-start" }}>
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
                      <button type="button" className="button button-primary" onClick={() => setEditingRegistrationId((current) => current === registration.id ? null : registration.id)}>
                        {editingRegistrationId === registration.id ? "Fechar edicao" : "Editar inscricao"}
                      </button>
                    </div>
                    {editingRegistrationId === registration.id ? (
                      <form action={updateAction} className="grid-form" style={{ marginTop: "0.75rem" }}>
                        <input type="hidden" name="registrationId" value={registration.id} />
                        <input type="hidden" name="tournamentId" value={tournamentId} />
                        <div className="field">
                          <label>Categoria</label>
                          <select name="categoryId" defaultValue={registration.categoryId} required>
                            {safeCategories.map((category) => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label>Atleta 1</label>
                          <input name="leadName" defaultValue={registration.leadName} required />
                        </div>
                        <div className="field">
                          <label>Telefone atleta 1</label>
                          <input name="leadPhone" defaultValue={registration.leadPhone} required />
                        </div>
                        <div className="field">
                          <label>CPF atleta 1</label>
                          <input name="leadCpf" defaultValue={registration.leadCpf} required />
                        </div>
                        <div className="field">
                          <label>Nascimento atleta 1</label>
                          <input name="leadBirthDate" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" defaultValue={new Date(registration.leadBirthDate).toLocaleDateString("pt-BR")} required />
                        </div>
                        <div className="field">
                          <label>Atleta 2</label>
                          <input name="partnerName" defaultValue={registration.partnerName} required />
                        </div>
                        <div className="field">
                          <label>Telefone atleta 2</label>
                          <input name="partnerPhone" defaultValue={registration.partnerPhone} required />
                        </div>
                        <div className="field">
                          <label>CPF atleta 2</label>
                          <input name="partnerCpf" defaultValue={registration.partnerCpf} required />
                        </div>
                        <div className="field">
                          <label>Nascimento atleta 2</label>
                          <input name="partnerBirthDate" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" defaultValue={new Date(registration.partnerBirthDate).toLocaleDateString("pt-BR")} required />
                        </div>
                        <div className="field">
                          <label>Valor (R$)</label>
                          <input name="amountReais" defaultValue={(registration.amountCents / 100).toFixed(2).replace(".", ",")} required />
                        </div>
                        <div className="field">
                          <label>Pagamento</label>
                          <select name="paymentStatus" defaultValue={registration.paymentStatus} required>
                            <option value="PENDING">Pendente</option>
                            <option value="PAID">Pago</option>
                          </select>
                        </div>
                        <div className="field field-submit">
                          <SubmitButton label="Salvar alteracoes" pendingLabel="Salvando..." className="button button-primary" />
                        </div>
                        {updateState?.error ? <p className="form-error form-full">{updateState.error}</p> : null}
                        {updateState?.success ? <p className="form-success form-full">{updateState.success}</p> : null}
                      </form>
                    ) : null}
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
