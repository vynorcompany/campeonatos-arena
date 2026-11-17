"use client";
import { PhoneInput } from "@/components/forms/phone-input";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { EventEditorSection } from "@/components/tournaments/event-editor-section";
import { viewStyles } from "./tournament-form.utilities";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { LocalDateTimeField } from "@/components/forms/local-date-time-field";
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
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  defaultRegistrationOpensAt?: string;
  defaultRegistrationClosesAt?: string;
  defaultEarlyDiscountCents?: number;
  defaultEarlyDiscountUntil?: string;
  defaultFirstBonusLimit?: number;
  defaultFirstBonusUntil?: string;
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
  defaultStartsAt = "",
  defaultEndsAt = "",
  defaultRegistrationOpensAt = "",
  defaultRegistrationClosesAt = "",
  defaultEarlyDiscountCents = 0,
  defaultEarlyDiscountUntil = "",
  defaultFirstBonusLimit = 0,
  defaultFirstBonusUntil = "",
  defaultPublicSlug = "",
  defaultRegistrationPhase = "REGISTRATIONS",
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
    <form action={formAction} className={viewStyles.tournament_editor_form}>
      {mode === "update" && tournamentId ? (
        <input type="hidden" name="tournamentId" value={tournamentId} />
      ) : null}

      <EventEditorSection title="Identificação"><div className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] tw:gap-3 tw:viewport-720:grid-cols-1">
        <label className={viewStyles.field}>Nome do evento<input id="name" name="name" placeholder="Ex.: Open da Arena — Agosto" defaultValue={defaultName} onChange={event => { if (!slugEdited) setPublicSlug(slugify(event.target.value)); }} required/></label>
        <label className={viewStyles.field}>Responsável pelo evento<input id="responsibleName" name="responsibleName" defaultValue={defaultResponsibleName} placeholder="Nome para dúvidas"/></label>
        <label className={viewStyles.field}>Telefone do responsável<PhoneInput id="responsiblePhone" name="responsiblePhone" defaultValue={defaultResponsiblePhone} placeholder="(00) 00000-0000"/></label>
        <label className={viewStyles.field_form_full}>Descrição<textarea id="description" name="description" placeholder="Datas, local, regras gerais e observações do evento." defaultValue={defaultDescription} rows={3}/></label>
      </div></EventEditorSection>

      <EventEditorSection title="Datas do evento e inscrições">
        <div className={viewStyles.tournament_editor_grid}>
          <LocalDateTimeField name="startsAt" label="Início do evento" defaultValue={defaultStartsAt} className={viewStyles.field}/>
          <LocalDateTimeField name="endsAt" label="Fim do evento" defaultValue={defaultEndsAt} className={viewStyles.field}/>
          <LocalDateTimeField name="registrationOpensAt" label="Abertura das inscrições" defaultValue={defaultRegistrationOpensAt} className={viewStyles.field}/>
          <LocalDateTimeField name="registrationClosesAt" label="Encerramento das inscrições" defaultValue={defaultRegistrationClosesAt} className={viewStyles.field}/>
          </div></EventEditorSection>

      <EventEditorSection title="Inscrições e divulgação">

        <div className={viewStyles.tournament_editor_grid}>
          <div className={viewStyles.field}><label htmlFor="creationMode">Origem das inscrições</label><select id="creationMode" name="creationMode" defaultValue={defaultCreationMode}><option value="MANUAL">Somente inscrições manuais</option><option value="PUBLIC">Aceitar inscrições pelo link público</option></select></div>
          <div className={viewStyles.field}><label htmlFor="registrationPhase">Fase do evento</label><select id="registrationPhase" name="registrationPhase" defaultValue={defaultRegistrationPhase}><option value="REGISTRATIONS">Inscrições abertas</option><option value="EDITING">Configuração</option><option value="LIVE">Em andamento</option><option value="FINISHED">Finalizado</option></select></div>
          <div className={viewStyles.field_form_full_tournament_public_slug}><label htmlFor="publicSlug">Link público do torneio</label><div><span aria-hidden="true">/inscricao/</span><input id="publicSlug" name="publicSlug" type="text" placeholder="open-arena-agosto" value={publicSlug} onChange={(event) => { setSlugEdited(true); setPublicSlug(slugify(event.target.value)); }} pattern="(?:[a-z0-9]|-)+" required /></div><p>Gerado a partir do nome; você pode personalizá-lo com letras minúsculas, números e hífens.</p></div>
          <label className={viewStyles.tournament_radar_setting_form_full}><input name="showInEventRadar" type="checkbox" defaultChecked={defaultShowInEventRadar} /><span aria-hidden="true" /><div><strong>Exibir no Radar de Eventos</strong><p>Atletas de outras arenas poderão encontrar este torneio e abrir a inscrição.</p></div></label>
        </div>
      </EventEditorSection>

      <EventEditorSection title="Desconto e bônus"><div className={viewStyles.tournament_editor_grid}>
          <div className={viewStyles.field}><label htmlFor="earlyDiscountReais">Desconto antecipado (R$)</label><MoneyInput smart id="earlyDiscountReais" name="earlyDiscountReais" defaultValue={formatMoneyInput(defaultEarlyDiscountCents)} /></div>
          <LocalDateTimeField name="earlyDiscountUntil" label="Desconto válido até" defaultValue={defaultEarlyDiscountUntil} className={viewStyles.field}/>
          <div className={viewStyles.field}><label htmlFor="firstBonusLimit">Bônus para os primeiros confirmados</label><input id="firstBonusLimit" name="firstBonusLimit" type="number" min="0" step="1" defaultValue={defaultFirstBonusLimit} /><p>0 desativa a lista de bônus.</p></div>
          <LocalDateTimeField name="firstBonusUntil" label="Bônus válido até" defaultValue={defaultFirstBonusUntil} className={viewStyles.field}/>
        </div>
      </EventEditorSection>

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

      <footer className={viewStyles.tournament_editor_footer}>
        <p>Após criar, você poderá incluir e organizar as categorias do torneio.</p>
        <SubmitButton
          label={submitLabel}
          pendingLabel={pendingLabel}
          className={viewStyles.button_button_primary}
        />
      </footer>

      {state?.error ? (
        <p className={viewStyles.form_error_form_full}>{state.error}</p>
      ) : null}
      {state?.success && mode === "update" ? (
        <p className={viewStyles.form_success_form_full}>{state.success}</p>
      ) : null}
    </form>
  );
}
