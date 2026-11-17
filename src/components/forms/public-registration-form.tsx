"use client";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";


import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-registration-form.utilities";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { createPublicRegistrationAction } from "@/lib/actions/public-registration";
import { ArenaLegalLinks } from "@/components/legal/arena-legal-links";
import { BotTrap } from "@/components/forms/bot-trap";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState = {
  error: null,
  success: null,
  paymentReference: undefined as string | undefined,
  amountCents: undefined as number | undefined,
  paymentQrCode: undefined as string | undefined,
  paymentQrCodeBase64: undefined as string | undefined,
  paymentCheckoutUrl: undefined as string | undefined,
  paymentMethod: undefined as "PIX" | "CARD" | undefined,
  registrationId: undefined as string | undefined
};

type Category = {
  id: string;
  name: string;
  registrationType?: string;
  competition?: { format: string } | null;
};

function formatCategoryName(input: string) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return `${trimmed}a`;
  }
  return trimmed;
}

export function PublicRegistrationForm({
  tournamentSlug,
  categories,
  arenaName,
  arenaSlug,
  arenaLogoUrl
  , responsibleName = "", responsiblePhone = ""
}: {
  tournamentSlug: string;
  categories: Category[];
  arenaName: string;
  arenaSlug?: string;
  arenaLogoUrl: string;
  responsibleName?: string;
  responsiblePhone?: string;
}) {
  const [state, formAction] = useFormState(createPublicRegistrationAction, initialState);
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const individual = categories.find(category => category.id === categoryId)?.registrationType === "INDIVIDUAL";
  const trio = categories.find(category => category.id === categoryId)?.competition?.format === "TRIO";

  useEffect(() => {
    if (state?.paymentCheckoutUrl && state.paymentMethod === "CARD") {
      window.location.href = state.paymentCheckoutUrl;
    }
    if (state?.registrationId && state.paymentMethod !== "CARD") {
      router.push(`/inscricao/${tournamentSlug}/sucesso/${state.registrationId}`);
    }
  }, [router, state?.paymentCheckoutUrl, state?.paymentMethod, state?.registrationId, tournamentSlug]);

  if (!categories.length) return <section className="tw:grid tw:min-w-0 tw:gap-2 tw:rounded-lg tw:border tw:border-[#c7d8eb] tw:bg-white tw:p-4 tw:text-[#172b45]"><h2 className="tw:m-0 tw:text-base tw:font-semibold">Inscrições encerradas</h2><p className="tw:m-0 tw:text-sm">Não há categorias abertas para inscrição neste momento. Acompanhe as equipes e os jogos nas abas acima.</p></section>;

  return (
    <div className={viewStyles.public_reg_shell}>
      <aside className={viewStyles.public_reg_aside_reveal_up}>
        <div className={viewStyles.public_reg_brand}>
          {arenaLogoUrl ? <img src={arenaLogoUrl} alt={`Logo da arena ${arenaName}`} /> : <span>{arenaName.slice(0, 1)}</span>}
          <strong>{arenaName}</strong>
        </div>
        <p className={viewStyles.public_reg_kicker}>Fluxo de inscrição</p>
        <div className={viewStyles.public_reg_steps}>
          <div className={viewStyles.public_reg_step_public_reg_step_done}>
            <span>1</span>
            <div><strong>{individual ? "Dados do atleta" : trio ? "Dados do trio" : "Dados da dupla"}</strong><small>{individual ? "Um atleta por inscrição" : trio ? "Preencha os dados dos três atletas" : "Preencha os dados de atleta 1 e atleta 2"}</small></div>
          </div>
          <div className={viewStyles.public_reg_step_public_reg_step_done}>
            <span>2</span>
            <div><strong>Categoria e pagamento</strong><small>Escolha categoria e forma de pagamento</small></div>
          </div>
          <div className={cx(`${viewStyles.public_reg_step} ${state?.success ? viewStyles.public_reg_step_active : ""}`)}>
            <span>3</span>
            <div><strong>Confirmação</strong><small>Após a aprovação do pagamento, a inscrição é confirmada</small></div>
          </div>
        </div>
      </aside>

      <form action={formAction} className={viewStyles.public_reg_form_reveal_up}>
        <input type="hidden" name="tournamentSlug" value={tournamentSlug} /><input type="hidden" name="registrationType" value={individual ? "INDIVIDUAL" : "PAIR"}/>
        {responsibleName ? <p className="public-reg-contact">Dúvidas? Fale com {responsibleName}{responsiblePhone ? ` · ${responsiblePhone}` : ""}.</p> : null}

        <section className={viewStyles.public_reg_card}>
          <header className={viewStyles.public_reg_card_head}>
            <h3>Configuração da inscrição</h3>
            <p>Selecione a categoria e a forma de pagamento. Se houver cobrança, a vaga ficará reservada por 1 hora e será confirmada após a aprovação.</p>
          </header>
          <div className={viewStyles.public_reg_grid_public_reg_grid_2}>
            <div className={viewStyles.field}>
              <label htmlFor="categoryId">Categoria</label>
              <SmartEntitySelect label="Categoria" id="categoryId" name="categoryId" value={categoryId} onChange={event => setCategoryId(event.target.value)} className={viewStyles.public_reg_select} required>
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{formatCategoryName(category.name)}</option>
                ))}
              </SmartEntitySelect>
            </div>

            <div className={viewStyles.field}>
              <label htmlFor="paymentMethod">Pagamento</label>
              <select id="paymentMethod" name="paymentMethod" className={viewStyles.public_reg_select} defaultValue="PIX" required>
                <option value="PIX">PIX</option>
                <option value="CARD">Cartão</option>
              </select>
            </div>
          </div>
        </section>

        <section className={viewStyles.public_reg_card}>
          <header className={viewStyles.public_reg_card_head}>
            <h3>Atleta 1</h3>
            <p>Dados do titular da inscrição.</p>
          </header>
          <div className={viewStyles.public_reg_grid_public_reg_grid_2}>
            <div className={viewStyles.field}><label htmlFor="leadName">Nome</label><input id="leadName" name="leadName" required /></div>
            <div className={viewStyles.field}><label htmlFor="leadEmail">E-mail</label><input id="leadEmail" name="leadEmail" type="email" required /></div>
            <div className={viewStyles.field}><label htmlFor="leadPhone">Telefone</label><input id="leadPhone" name="leadPhone" required /></div>
            <div className={viewStyles.field}><label htmlFor="leadCpf">CPF</label><input id="leadCpf" name="leadCpf" required /></div>
          </div>
        </section>

        {!individual ? <section className={viewStyles.public_reg_card}>
          <header className={viewStyles.public_reg_card_head}>
            <h3>Atleta 2</h3>
            <p>Dados do segundo atleta da equipe.</p>
          </header>
          <div className={viewStyles.public_reg_grid_public_reg_grid_2}>
            <div className={viewStyles.field}><label htmlFor="partnerName">Nome</label><input id="partnerName" name="partnerName" required /></div>
            <div className={viewStyles.field}><label htmlFor="partnerPhone">Telefone</label><input id="partnerPhone" name="partnerPhone" required /></div>
            <div className={viewStyles.field}><label htmlFor="partnerCpf">CPF</label><input id="partnerCpf" name="partnerCpf" required /></div>
          </div>
        </section> : null}

        {trio ? <section className={viewStyles.public_reg_card}><header className={viewStyles.public_reg_card_head}><h3>Atleta 3</h3><p>Dados do terceiro atleta do trio. O total da equipe considera a inscrição de cada um dos três atletas.</p></header><div className={viewStyles.public_reg_grid_public_reg_grid_2}><div className={viewStyles.field}><label htmlFor="thirdName">Nome</label><input id="thirdName" name="thirdName" required /></div><div className={viewStyles.field}><label htmlFor="thirdPhone">Telefone</label><input id="thirdPhone" name="thirdPhone" required /></div><div className={viewStyles.field}><label htmlFor="thirdCpf">CPF</label><input id="thirdCpf" name="thirdCpf" required /></div></div></section> : null}
        <BotTrap/>
        <p className="tw:col-span-full tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">O CPF identifica o atleta e evita inscrições duplicadas no cálculo dos preços por categoria. {individual ? "Consulte as condições da arena e a política de privacidade antes de continuar." : "Nome e resultados da equipe poderão aparecer na competição. Informe os demais atletas sobre o uso desses dados e consulte as condições da arena antes de continuar."}</p>
        <div className={viewStyles.public_reg_submit}>
          <SubmitButton label="Ir para pagamento" pendingLabel="Criando inscrição..." className={viewStyles.button_button_primary} />
        </div>

        {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
        {state?.success ? (
          <div className={viewStyles.form_success_form_full_reveal_up}>
            {state.success} Referência: <strong>{state.paymentReference}</strong> · Valor: <strong>R$ {((state.amountCents ?? 0) / 100).toFixed(2)}</strong>
            <br />Status: <strong>{state.registrationId ? "Pagamento pendente" : "Confirmado"}</strong>
          </div>
        ) : null}
      </form>
      <footer className="tw:col-span-full tw:min-w-0 tw:px-1 tw:py-4"><ArenaLegalLinks arenaSlug={arenaSlug}/></footer>
    </div>
  );
}
