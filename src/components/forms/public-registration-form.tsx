"use client";

import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-registration-form.utilities";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { createPublicRegistrationAction } from "@/lib/actions/public-registration";
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
};

function formatCategoryName(input: string) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return `${trimmed}a`;
  }
  return trimmed;
}

function formatBirthDate(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("/");
}

export function PublicRegistrationForm({
  tournamentSlug,
  categories,
  arenaName,
  arenaLogoUrl
  , responsibleName = "", responsiblePhone = ""
}: {
  tournamentSlug: string;
  categories: Category[];
  arenaName: string;
  arenaLogoUrl: string;
  responsibleName?: string;
  responsiblePhone?: string;
}) {
  const [state, formAction] = useFormState(createPublicRegistrationAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state?.paymentCheckoutUrl && state.paymentMethod === "CARD") {
      window.location.href = state.paymentCheckoutUrl;
    }
    if (state?.registrationId && state.paymentMethod !== "CARD") {
      router.push(`/inscricao/${tournamentSlug}/sucesso/${state.registrationId}`);
    }
  }, [router, state?.paymentCheckoutUrl, state?.paymentMethod, state?.registrationId, tournamentSlug]);

  return (
    <div className={viewStyles.public_reg_shell}>
      <aside className={viewStyles.public_reg_aside_reveal_up}>
        <div className={viewStyles.public_reg_brand}>
          {arenaLogoUrl ? <img src={arenaLogoUrl} alt={`Logo da arena ${arenaName}`} /> : <span>{arenaName.slice(0, 1)}</span>}
          <strong>{arenaName}</strong>
        </div>
        <p className={viewStyles.public_reg_kicker}>Fluxo de inscricao</p>
        <div className={viewStyles.public_reg_steps}>
          <div className={viewStyles.public_reg_step_public_reg_step_done}>
            <span>1</span>
            <div><strong>Dados da dupla</strong><small>Preencha os dados de atleta 1 e atleta 2</small></div>
          </div>
          <div className={viewStyles.public_reg_step_public_reg_step_done}>
            <span>2</span>
            <div><strong>Categoria e pagamento</strong><small>Escolha categoria e forma de pagamento</small></div>
          </div>
          <div className={cx(`${viewStyles.public_reg_step} ${state?.success ? viewStyles.public_reg_step_active : ""}`)}>
            <span>3</span>
            <div><strong>Confirmacao</strong><small>Inscricao confirmada automaticamente (modo teste)</small></div>
          </div>
        </div>
      </aside>

      <form action={formAction} className={viewStyles.public_reg_form_reveal_up}>
        <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
        {responsibleName ? <p className="public-reg-contact">Dúvidas? Fale com {responsibleName}{responsiblePhone ? ` · ${responsiblePhone}` : ""}.</p> : null}

        <section className={viewStyles.public_reg_card}>
          <header className={viewStyles.public_reg_card_head}>
            <h3>Configuracao da inscricao</h3>
            <p>Selecione a categoria e a forma de pagamento. A vaga será confirmada automaticamente após a aprovação.</p>
          </header>
          <div className={viewStyles.public_reg_grid_public_reg_grid_2}>
            <div className={viewStyles.field}>
              <label htmlFor="categoryId">Categoria</label>
              <select id="categoryId" name="categoryId" className={viewStyles.public_reg_select} required>
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{formatCategoryName(category.name)}</option>
                ))}
              </select>
            </div>

            <div className={viewStyles.field}>
              <label htmlFor="paymentMethod">Pagamento</label>
              <select id="paymentMethod" name="paymentMethod" className={viewStyles.public_reg_select} defaultValue="PIX" required>
                <option value="PIX">PIX</option>
                <option value="CARD">Cartao</option>
              </select>
            </div>
          </div>
        </section>

        <section className={viewStyles.public_reg_card}>
          <header className={viewStyles.public_reg_card_head}>
            <h3>Atleta 1</h3>
            <p>Dados do titular da inscricao.</p>
          </header>
          <div className={viewStyles.public_reg_grid_public_reg_grid_2}>
            <div className={viewStyles.field}><label htmlFor="leadName">Nome</label><input id="leadName" name="leadName" required /></div>
            <div className={viewStyles.field}><label htmlFor="leadEmail">E-mail</label><input id="leadEmail" name="leadEmail" type="email" required /></div>
            <div className={viewStyles.field}><label htmlFor="leadPhone">Telefone</label><input id="leadPhone" name="leadPhone" required /></div>
            <div className={viewStyles.field}><label htmlFor="leadCpf">CPF</label><input id="leadCpf" name="leadCpf" required /></div>
            <div className={viewStyles.field}><label htmlFor="leadBirthDate">Nascimento</label><input id="leadBirthDate" name="leadBirthDate" className={viewStyles.public_reg_date} type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} onChange={(event) => { event.currentTarget.value = formatBirthDate(event.currentTarget.value); }} required /></div>
          </div>
        </section>

        <section className={viewStyles.public_reg_card}>
          <header className={viewStyles.public_reg_card_head}>
            <h3>Atleta 2</h3>
            <p>Dados do parceiro da dupla.</p>
          </header>
          <div className={viewStyles.public_reg_grid_public_reg_grid_2}>
            <div className={viewStyles.field}><label htmlFor="partnerName">Nome</label><input id="partnerName" name="partnerName" required /></div>
            <div className={viewStyles.field}><label htmlFor="partnerPhone">Telefone</label><input id="partnerPhone" name="partnerPhone" required /></div>
            <div className={viewStyles.field}><label htmlFor="partnerCpf">CPF</label><input id="partnerCpf" name="partnerCpf" required /></div>
            <div className={viewStyles.field}><label htmlFor="partnerBirthDate">Nascimento</label><input id="partnerBirthDate" name="partnerBirthDate" className={viewStyles.public_reg_date} type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} onChange={(event) => { event.currentTarget.value = formatBirthDate(event.currentTarget.value); }} required /></div>
          </div>
        </section>

        <div className={viewStyles.public_reg_submit}>
          <SubmitButton label="Ir para pagamento" pendingLabel="Criando inscrição..." className={viewStyles.button_button_primary} />
        </div>

        {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
        {state?.success ? (
          <div className={viewStyles.form_success_form_full_reveal_up}>
            {state.success} Referencia: <strong>{state.paymentReference}</strong> · Valor: <strong>R$ {((state.amountCents ?? 0) / 100).toFixed(2)}</strong>
            <br />Status: <strong>{state.registrationId ? "Pagamento pendente" : "Confirmado"}</strong>
          </div>
        ) : null}
      </form>
    </div>
  );
}
