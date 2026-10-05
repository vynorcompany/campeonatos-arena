"use client";

import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./tournament-participants-form.utilities";
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
    <div className={viewStyles.stack_md}>
      <article className={viewStyles.section_card}>
        <h3>Inscrever dupla manualmente</h3>
        {!eligiblePlayers.length ? (
          <p className={viewStyles.muted}>Nenhum atleta ativo possui os dados completos. Atualize telefone, CPF e nascimento em <a href="/jogadores">Atletas</a>.</p>
        ) : (
        <form action={formAction} className={viewStyles.grid_form}>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <div className={viewStyles.field}>
            <label htmlFor="categoryId">Categoria</label>
            <select id="categoryId" name="categoryId" required>
              {safeCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="leadPlayerId">Atleta 1</label>
            <select id="leadPlayerId" name="leadPlayerId" required>
              <option value="">Selecione um atleta</option>
              {eligiblePlayers.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="partnerPlayerId">Atleta 2</label>
            <select id="partnerPlayerId" name="partnerPlayerId" required>
              <option value="">Selecione um atleta</option>
              {eligiblePlayers.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="amountReais">Valor (R$)</label>
            <input id="amountReais" name="amountReais" type="text" placeholder="Ex.: 150,00" required />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="paymentStatus">Pagamento</label>
            <select id="paymentStatus" name="paymentStatus" defaultValue="PENDING">
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
            </select>
          </div>
          <div className={viewStyles.field_field_submit}>
            <SubmitButton label="Inscrever manualmente" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
          </div>
          {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
          {state?.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}
        </form>
        )}
      </article>

      <article className={viewStyles.section_card}>
        <h3>Inscritos pelo link e manuais</h3>
        <div className={viewStyles.field}>
          <label htmlFor="participant-search">Buscar inscrito</label>
          <input id="participant-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, dupla ou categoria" />
        </div>
        {!safeFiltered.length ? (
          <p className={viewStyles.muted}>Nenhuma inscricao encontrada.</p>
        ) : (
          <div className={viewStyles.simple_list}>
            {safeFiltered.map((registration) => {
              const paid = registration.paymentStatus === "PAID";
              return (
                <div key={registration.id} className={viewStyles.simple_item}>
                  <div className={viewStyles.stack_xs}>
                    <strong>{registration.leadName} / {registration.partnerName}</strong>
                    <span className={viewStyles.muted}>
                      {registration.categoryName} · {formatCurrency(registration.amountCents)} · {new Date(registration.createdAt).toLocaleString("pt-BR")}
                    </span>
                    <div className={viewStyles.section_actions}>
                      <span className={cx(`${viewStyles.player_status_pill}${paid ? "" : " " + viewStyles.player_status_pill_inactive}`)}>
                        Pagamento: {getPaymentLabel(registration.paymentStatus)}
                      </span>
                      <span className={cx(`${viewStyles.player_status_pill}${paid ? "" : " " + viewStyles.player_status_pill_inactive}`)}>
                        Situacao: {getConfirmationLabel(registration.paymentStatus)}
                      </span>
                      <form action={deleteTournamentRegistrationAction}>
                        <input type="hidden" name="registrationId" value={registration.id} />
                        <SubmitButton label="Excluir participante" pendingLabel="Excluindo..." className={viewStyles.button} />
                      </form>
                      <button type="button" className={viewStyles.button_button_primary} onClick={() => setEditingRegistrationId((current) => current === registration.id ? null : registration.id)}>
                        {editingRegistrationId === registration.id ? "Fechar edicao" : "Editar inscricao"}
                      </button>
                    </div>
                    {editingRegistrationId === registration.id ? (
                      <form action={updateAction} className={viewStyles.grid_form_2}>
                        <input type="hidden" name="registrationId" value={registration.id} />
                        <input type="hidden" name="tournamentId" value={tournamentId} />
                        <div className={viewStyles.field}>
                          <label>Categoria</label>
                          <select name="categoryId" defaultValue={registration.categoryId} required>
                            {safeCategories.map((category) => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className={viewStyles.field}>
                          <label>Atleta 1</label>
                          <input name="leadName" defaultValue={registration.leadName} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>Telefone atleta 1</label>
                          <input name="leadPhone" defaultValue={registration.leadPhone} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>CPF atleta 1</label>
                          <input name="leadCpf" defaultValue={registration.leadCpf} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>Nascimento atleta 1</label>
                          <input name="leadBirthDate" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" defaultValue={new Date(registration.leadBirthDate).toLocaleDateString("pt-BR")} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>Atleta 2</label>
                          <input name="partnerName" defaultValue={registration.partnerName} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>Telefone atleta 2</label>
                          <input name="partnerPhone" defaultValue={registration.partnerPhone} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>CPF atleta 2</label>
                          <input name="partnerCpf" defaultValue={registration.partnerCpf} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>Nascimento atleta 2</label>
                          <input name="partnerBirthDate" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" defaultValue={new Date(registration.partnerBirthDate).toLocaleDateString("pt-BR")} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>Valor (R$)</label>
                          <input name="amountReais" defaultValue={(registration.amountCents / 100).toFixed(2).replace(".", ",")} required />
                        </div>
                        <div className={viewStyles.field}>
                          <label>Pagamento</label>
                          <select name="paymentStatus" defaultValue={registration.paymentStatus} required>
                            <option value="PENDING">Pendente</option>
                            <option value="PAID">Pago</option>
                          </select>
                        </div>
                        <div className={viewStyles.field_field_submit}>
                          <SubmitButton label="Salvar alteracoes" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
                        </div>
                        {updateState?.error ? <p className={viewStyles.form_error_form_full}>{updateState.error}</p> : null}
                        {updateState?.success ? <p className={viewStyles.form_success_form_full}>{updateState.success}</p> : null}
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
