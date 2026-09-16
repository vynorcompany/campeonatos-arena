"use client";

import { useEffect, useState } from "react";
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type TournamentFormProps = {
  mode?: "create" | "update";
  tournamentId?: string;
  defaultName?: string;
  defaultDescription?: string;
  defaultResponsibleName?: string;
  defaultResponsiblePhone?: string;
  defaultPublicSlug?: string;
  defaultRegistrationPhase?: string;
  defaultShowInEventRadar?: boolean;
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
  defaultResponsibleName = "",
  defaultResponsiblePhone = "",
  defaultPublicSlug = "",
  defaultRegistrationPhase = "EDITING",
  defaultShowInEventRadar = false,
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
  const [publicSlug, setPublicSlug] = useState(defaultPublicSlug);
  const [slugEdited, setSlugEdited] = useState(mode === "update");

  useEffect(() => {
    if (mode === "create" && state.success && state.tournamentId) {
      router.push(`/torneios/${state.tournamentId}?tab=categories`);
    }
  }, [mode, router, state.success, state.tournamentId]);

  return (
    <form action={formAction} className="tournament-editor-form">
      {mode === "update" && tournamentId ? (
        <input type="hidden" name="tournamentId" value={tournamentId} />
      ) : null}

      <section className="tournament-editor-section">
        <header><span>01</span><div><h2>Dados do evento</h2><p>Informe o essencial. Categorias e chaveamento são configurados na próxima etapa.</p></div></header>
        <div className="tournament-editor-grid">
          <div className="field form-full"><label htmlFor="name">Nome do evento</label><input id="name" name="name" type="text" placeholder="Ex.: Open da Arena — Agosto" defaultValue={defaultName} onChange={(event) => { if (!slugEdited) setPublicSlug(slugify(event.target.value)); }} required /></div>
          <div className="field form-full"><label htmlFor="description">Descrição</label><textarea id="description" name="description" placeholder="Datas, local, regras gerais e observações do evento." defaultValue={defaultDescription} rows={4} /></div>
          <div className="field"><label htmlFor="responsibleName">Responsável pelo torneio</label><input id="responsibleName" name="responsibleName" defaultValue={defaultResponsibleName} placeholder="Nome para dúvidas" /></div>
          <div className="field"><label htmlFor="responsiblePhone">Telefone do responsável</label><input id="responsiblePhone" name="responsiblePhone" inputMode="tel" defaultValue={defaultResponsiblePhone} placeholder="(00) 00000-0000" /></div>
        </div>
      </section>

      <section className="tournament-editor-section tournament-editor-publication">
        <header><span>02</span><div><h2>Inscrições e divulgação</h2><p>Defina como os atletas entram no torneio e onde ele será exibido.</p></div></header>
        <div className="tournament-editor-grid">
          <div className="field"><label htmlFor="creationMode">Origem das inscrições</label><select id="creationMode" name="creationMode" defaultValue={defaultCreationMode}><option value="MANUAL">Somente inscrições manuais</option><option value="PUBLIC">Aceitar inscrições pelo link público</option></select></div>
          <div className="field"><label htmlFor="registrationPhase">Fase do evento</label><select id="registrationPhase" name="registrationPhase" defaultValue={defaultRegistrationPhase}><option value="REGISTRATIONS">Inscrições abertas</option><option value="EDITING">Configuração</option><option value="LIVE">Em andamento</option><option value="FINISHED">Finalizado</option></select></div>
          <div className="field form-full tournament-public-slug"><label htmlFor="publicSlug">Link público do torneio</label><div><span aria-hidden="true">/inscricao/</span><input id="publicSlug" name="publicSlug" type="text" placeholder="open-arena-agosto" value={publicSlug} onChange={(event) => { setSlugEdited(true); setPublicSlug(slugify(event.target.value)); }} pattern="[a-z0-9-]+" required /></div><p>Gerado a partir do nome; você pode personalizá-lo com letras minúsculas, números e hífens.</p></div>
          <label className="tournament-radar-setting form-full"><input name="showInEventRadar" type="checkbox" defaultChecked={defaultShowInEventRadar} /><span aria-hidden="true" /><div><strong>Exibir no Radar de Eventos</strong><p>Atletas de outras arenas poderão encontrar este torneio e abrir a inscrição.</p></div></label>
        </div>
      </section>

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

      <footer className="tournament-editor-footer">
        <p>Após criar, você poderá incluir e organizar as categorias do torneio.</p>
        <SubmitButton
          label={submitLabel}
          pendingLabel={pendingLabel}
          className="button button-primary"
        />
      </footer>

      {state?.error ? (
        <p className="form-error form-full">{state.error}</p>
      ) : null}
      {state?.success && mode === "update" ? (
        <p className="form-success form-full">{state.success}</p>
      ) : null}
    </form>
  );
}
