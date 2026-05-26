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

export function PublicRegistrationForm({ tournamentSlug, categories }: { tournamentSlug: string; categories: Category[] }) {
  const [state, formAction] = useFormState(createPublicRegistrationAction, initialState);

  useEffect(() => {
    if (state?.paymentCheckoutUrl) {
      window.location.href = state.paymentCheckoutUrl;
    }
  }, [state?.paymentCheckoutUrl]);

  return (
    <form action={formAction} className="grid-form">
      <input type="hidden" name="tournamentSlug" value={tournamentSlug} />

      <div className="field">
        <label htmlFor="categoryId">Categoria</label>
        <select id="categoryId" name="categoryId" required>
          <option value="">Selecione</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{formatCategoryName(category.name)}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="paymentMethod">Pagamento</label>
        <select id="paymentMethod" name="paymentMethod" defaultValue="PIX" required>
          <option value="PIX">PIX</option>
          <option value="CARD">Cartao</option>
        </select>
      </div>

      <fieldset className="form-full section-card stack-sm">
        <legend><strong>Atleta 1</strong></legend>
        <div className="grid-form" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="field"><label htmlFor="leadName">Nome</label><input id="leadName" name="leadName" required /></div>
          <div className="field"><label htmlFor="leadEmail">E-mail</label><input id="leadEmail" name="leadEmail" type="email" required /></div>
          <div className="field"><label htmlFor="leadPhone">Telefone</label><input id="leadPhone" name="leadPhone" required /></div>
          <div className="field"><label htmlFor="leadCpf">CPF</label><input id="leadCpf" name="leadCpf" required /></div>
          <div className="field"><label htmlFor="leadBirthDate">Nascimento</label><input id="leadBirthDate" name="leadBirthDate" type="date" required /></div>
        </div>
      </fieldset>

      <fieldset className="form-full section-card stack-sm">
        <legend><strong>Atleta 2</strong></legend>
        <div className="grid-form" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="field"><label htmlFor="partnerName">Nome</label><input id="partnerName" name="partnerName" required /></div>
          <div className="field"><label htmlFor="partnerPhone">Telefone</label><input id="partnerPhone" name="partnerPhone" required /></div>
          <div className="field"><label htmlFor="partnerCpf">CPF</label><input id="partnerCpf" name="partnerCpf" required /></div>
          <div className="field"><label htmlFor="partnerBirthDate">Nascimento</label><input id="partnerBirthDate" name="partnerBirthDate" type="date" required /></div>
        </div>
      </fieldset>

      <div className="field field-submit">
        <SubmitButton label="Inscrever e gerar pagamento" pendingLabel="Gerando cobranca..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? (
        <p className="form-success form-full">
          {state.success} Referencia: <strong>{state.paymentReference}</strong> · Valor: <strong>R$ {((state.amountCents ?? 0) / 100).toFixed(2)}</strong>
          {state.paymentMethod === "PIX" ? (
            <>
              <br />Status: <strong>Aguardando pagamento</strong>
              {state.paymentQrCode ? <><br />PIX copia e cola: <code>{state.paymentQrCode}</code></> : null}
              {state.paymentCheckoutUrl ? <><br /><a href={state.paymentCheckoutUrl} target="_blank" rel="noreferrer">Abrir tela PIX no Mercado Pago</a></> : null}
            </>
          ) : null}
          {state.paymentMethod === "CARD" && state.paymentCheckoutUrl ? (
            <><br />Redirecionando para checkout de cartao... <a href={state.paymentCheckoutUrl} target="_blank" rel="noreferrer">Abrir manualmente</a></>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
