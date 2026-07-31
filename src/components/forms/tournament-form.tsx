"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  createTournamentAction,
  type ActionState,
  updateTournamentAction,
} from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null,
};

type TournamentFormProps = {
  mode?: "create" | "update";
  tournamentId?: string;
  defaultName?: string;
  defaultDescription?: string;
  defaultPublicSlug?: string;
  defaultRegistrationPhase?: string;
  defaultCreationMode?: "MANUAL" | "PUBLIC";
  defaultGroupCount?: number;
  defaultPairsPerGroup?: number;
  defaultPriceFirstCents?: number;
  defaultPriceSecondCents?: number;
  defaultPriceThirdCents?: number;
  defaultBlockCategoryGap?: boolean;
  defaultMaxCategoryGap?: number;
  defaultCategoryList?: string;
  defaultRankingId?: string;
  rankings?: { id: string; name: string }[];
  submitLabel?: string;
  pendingLabel?: string;
};

export function TournamentForm({
  mode = "create",
  tournamentId,
  defaultName = "",
  defaultDescription = "",
  defaultPublicSlug = "",
  defaultRegistrationPhase = "EDITING",
  defaultCreationMode = "MANUAL",
  defaultGroupCount = 4,
  defaultPairsPerGroup = 3,
  defaultPriceFirstCents = 0,
  defaultPriceSecondCents = 0,
  defaultPriceThirdCents = 0,
  defaultBlockCategoryGap = false,
  defaultMaxCategoryGap = 1,
  defaultCategoryList = "",
  defaultRankingId = "",
  submitLabel = "Criar evento",
  pendingLabel = "Criando...",
}: TournamentFormProps) {
  const action =
    mode === "update" ? updateTournamentAction : createTournamentAction;
  const [state, formAction] = useFormState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (mode === "create" && state.success && state.tournamentId) {
      router.push(`/torneios/${state.tournamentId}?tab=categories`);
    }
  }, [mode, router, state.success, state.tournamentId]);

  return (
    <form action={formAction} className="grid-form">
      {mode === "update" && tournamentId ? (
        <input type="hidden" name="tournamentId" value={tournamentId} />
      ) : null}

      <div className="field">
        <label htmlFor="name">Nome do evento</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Ex.: Open da Arena — Agosto"
          defaultValue={defaultName}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="creationMode">Origem das inscrições</label>
        <select
          id="creationMode"
          name="creationMode"
          defaultValue={defaultCreationMode}
        >
          <option value="MANUAL">Somente inscrições manuais</option>
          <option value="PUBLIC">Aceitar inscrições pelo link público</option>
        </select>
      </div>

      <div className="field form-full">
        <label htmlFor="description">Descrição</label>
        <textarea
          id="description"
          name="description"
          placeholder="Datas, local, regras gerais e observações do evento."
          defaultValue={defaultDescription}
          rows={4}
        />
      </div>

      <div className="field">
        <label htmlFor="publicSlug">Identificador do link público</label>
        <input
          id="publicSlug"
          name="publicSlug"
          type="text"
          placeholder="open-arena-agosto"
          defaultValue={defaultPublicSlug}
          pattern="[a-z0-9-]+"
          required
        />
        <p className="muted">Use letras minúsculas, números e hífens.</p>
      </div>

      <div className="field">
        <label htmlFor="registrationPhase">Fase do evento</label>
        <select
          id="registrationPhase"
          name="registrationPhase"
          defaultValue={defaultRegistrationPhase}
        >
          <option value="REGISTRATIONS">Inscrições abertas</option>
          <option value="EDITING">Configuração</option>
          <option value="LIVE">Em andamento</option>
          <option value="FINISHED">Finalizado</option>
        </select>
      </div>

      <input type="hidden" name="groupCount" value={String(defaultGroupCount)} />
      <input
        type="hidden"
        name="pairsPerGroup"
        value={String(defaultPairsPerGroup)}
      />
      <input
        type="hidden"
        name="priceFirstCents"
        value={String(Math.round(defaultPriceFirstCents / 100))}
      />
      <input
        type="hidden"
        name="priceSecondCents"
        value={String(Math.round(defaultPriceSecondCents / 100))}
      />
      <input
        type="hidden"
        name="priceThirdCents"
        value={String(Math.round(defaultPriceThirdCents / 100))}
      />
      <input
        type="hidden"
        name="maxCategoryGap"
        value={String(defaultMaxCategoryGap)}
      />
      <input type="hidden" name="categoryList" value={defaultCategoryList} />
      <input type="hidden" name="rankingId" value={defaultRankingId} />
      {defaultBlockCategoryGap ? (
        <input type="hidden" name="blockCategoryGap" value="on" />
      ) : null}

      <div className="field field-submit form-full">
        <SubmitButton
          label={submitLabel}
          pendingLabel={pendingLabel}
          className="button button-primary"
        />
      </div>

      {state?.error ? (
        <p className="form-error form-full">{state.error}</p>
      ) : null}
      {state?.success && mode === "update" ? (
        <p className="form-success form-full">{state.success}</p>
      ) : null}
    </form>
  );
}
