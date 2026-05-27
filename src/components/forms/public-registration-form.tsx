"use client";

import { useEffect } from "react";
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
  paymentMethod: undefined as "PIX" | "CARD" | undefined
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

export function PublicRegistrationForm({
  tournamentSlug,
  categories,
  arenaName,
  arenaLogoUrl
}: {
  tournamentSlug: string;
  categories: Category[];
  arenaName: string;
  arenaLogoUrl: string;
}) {
  const [state, formAction] = useFormState(createPublicRegistrationAction, initialState);

  useEffect(() => {
    if (state?.paymentCheckoutUrl) {
      window.location.href = state.paymentCheckoutUrl;
    }
  }, [state?.paymentCheckoutUrl]);

  return (
    <div className="public-reg-shell">
      <aside className="public-reg-aside reveal-up">
        <div className="public-reg-brand">
          {arenaLogoUrl ? <img src={arenaLogoUrl} alt={`Logo da arena ${arenaName}`} /> : <span>{arenaName.slice(0, 1)}</span>}
          <strong>{arenaName}</strong>
        </div>
        <p className="public-reg-kicker">Fluxo de inscricao</p>
        <div className="public-reg-steps">
          <div className="public-reg-step public-reg-step-done">
            <span>1</span>
            <div><strong>Dados da dupla</strong><small>Preencha os dados de atleta 1 e atleta 2</small></div>
          </div>
          <div className="public-reg-step public-reg-step-done">
            <span>2</span>
            <div><strong>Categoria e pagamento</strong><small>Escolha categoria e forma de pagamento</small></div>
          </div>
          <div className={`public-reg-step ${state?.success ? "public-reg-step-active" : ""}`}>
            <span>3</span>
            <div><strong>Confirmacao</strong><small>Inscricao confirmada automaticamente (modo teste)</small></div>
          </div>
        </div>
      </aside>

      <form action={formAction} className="public-reg-form reveal-up" style={{ animationDelay: "120ms" }}>
        <input type="hidden" name="tournamentSlug" value={tournamentSlug} />

        <section className="public-reg-card">
          <header className="public-reg-card-head">
            <h3>Configuracao da inscricao</h3>
            <p>Selecione a categoria. O pagamento esta desabilitado no modo de testes.</p>
          </header>
          <div className="public-reg-grid public-reg-grid-2">
            <div className="field">
              <label htmlFor="categoryId">Categoria</label>
              <select id="categoryId" name="categoryId" className="public-reg-select" required>
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{formatCategoryName(category.name)}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="paymentMethod">Pagamento</label>
              <select id="paymentMethod" name="paymentMethod" className="public-reg-select" defaultValue="PIX" required>
                <option value="PIX">PIX</option>
                <option value="CARD">Cartao</option>
              </select>
            </div>
          </div>
        </section>

        <section className="public-reg-card">
          <header className="public-reg-card-head">
            <h3>Atleta 1</h3>
            <p>Dados do titular da inscricao.</p>
          </header>
          <div className="public-reg-grid public-reg-grid-2">
            <div className="field"><label htmlFor="leadName">Nome</label><input id="leadName" name="leadName" required /></div>
            <div className="field"><label htmlFor="leadEmail">E-mail</label><input id="leadEmail" name="leadEmail" type="email" required /></div>
            <div className="field"><label htmlFor="leadPhone">Telefone</label><input id="leadPhone" name="leadPhone" required /></div>
            <div className="field"><label htmlFor="leadCpf">CPF</label><input id="leadCpf" name="leadCpf" required /></div>
            <div className="field"><label htmlFor="leadBirthDate">Nascimento</label><input id="leadBirthDate" name="leadBirthDate" className="public-reg-date" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" required /></div>
          </div>
        </section>

        <section className="public-reg-card">
          <header className="public-reg-card-head">
            <h3>Atleta 2</h3>
            <p>Dados do parceiro da dupla.</p>
          </header>
          <div className="public-reg-grid public-reg-grid-2">
            <div className="field"><label htmlFor="partnerName">Nome</label><input id="partnerName" name="partnerName" required /></div>
            <div className="field"><label htmlFor="partnerPhone">Telefone</label><input id="partnerPhone" name="partnerPhone" required /></div>
            <div className="field"><label htmlFor="partnerCpf">CPF</label><input id="partnerCpf" name="partnerCpf" required /></div>
            <div className="field"><label htmlFor="partnerBirthDate">Nascimento</label><input id="partnerBirthDate" name="partnerBirthDate" className="public-reg-date" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" required /></div>
          </div>
        </section>

        <div className="public-reg-submit">
          <SubmitButton label="Inscrever e confirmar" pendingLabel="Confirmando..." className="button button-primary" />
        </div>

        {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
        {state?.success ? (
          <div className="form-success form-full reveal-up" style={{ animationDelay: "180ms" }}>
            {state.success} Referencia: <strong>{state.paymentReference}</strong> · Valor: <strong>R$ {((state.amountCents ?? 0) / 100).toFixed(2)}</strong>
            <br />Status: <strong>Confirmado</strong>
          </div>
        ) : null}
      </form>
    </div>
  );
}
