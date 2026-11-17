"use client";
import { EmailInput } from "@/components/forms/email-input";
import { PhoneInput } from "@/components/forms/phone-input";
import { CpfInput } from "@/components/forms/cpf-input";
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
  redirectToCheckout: undefined as boolean | undefined,
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
  priceFirstCents?: number;
  priceSecondCents?: number;
  priceThirdCents?: number;
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
  arenaSlug,
  onlinePaymentEnabled = true,
  rules = "",
  earlyDiscountCents = 0,
  earlyDiscountUntil = null,
  responsibleName = "", responsiblePhone = ""
}: {
  tournamentSlug: string;
  categories: Category[];
  arenaName: string;
  arenaSlug?: string;
  onlinePaymentEnabled?: boolean;
  rules?: string;
  earlyDiscountCents?: number;
  earlyDiscountUntil?: string | null;
  arenaLogoUrl: string;
  responsibleName?: string;
  responsiblePhone?: string;
}) {
  const [state, formAction] = useFormState(createPublicRegistrationAction, initialState);
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories.length === 1 ? categories[0].id : "");
  const selectedCategory = categories.find(category => category.id === categoryId);
  const individual = selectedCategory?.registrationType === "INDIVIDUAL";
  const formatPersonPrice = (cents: number) => cents === 0 ? "Gratuita" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const personPrices = selectedCategory && selectedCategory.priceFirstCents != null ? [selectedCategory.priceFirstCents, selectedCategory.priceSecondCents ?? selectedCategory.priceFirstCents, selectedCategory.priceThirdCents ?? selectedCategory.priceFirstCents] : null;
  const discountActive = earlyDiscountCents > 0 && (!earlyDiscountUntil || new Date(earlyDiscountUntil).getTime() >= Date.now());
  const hasPriceTiers = personPrices && new Set(personPrices).size > 1;
  const trio = categories.find(category => category.id === categoryId)?.competition?.format === "TRIO";

  useEffect(() => {
    if (state?.paymentCheckoutUrl && (state.paymentMethod === "CARD" || state.redirectToCheckout)) {
      window.location.href = state.paymentCheckoutUrl;
    }
    if (state?.registrationId && state.paymentMethod !== "CARD" && !state.redirectToCheckout) {
      router.push(`/inscricao/${tournamentSlug}/sucesso/${state.registrationId}`);
    }
  }, [router, state?.redirectToCheckout, state?.paymentCheckoutUrl, state?.paymentMethod, state?.registrationId, tournamentSlug]);

  if (!categories.length) return <section className="tw:grid tw:min-w-0 tw:gap-2 tw:rounded-lg tw:border tw:border-[#c7d8eb] tw:bg-white tw:p-4 tw:text-[#172b45]"><h2 className="tw:m-0 tw:text-base tw:font-semibold">Inscrições encerradas</h2><p className="tw:m-0 tw:text-sm">Não há categorias abertas para inscrição neste momento. Acompanhe as equipes e os jogos nas abas acima.</p></section>;

  return <div className={viewStyles.public_reg_shell}>
    <form action={formAction} className={viewStyles.public_reg_form_reveal_up}>
      <input type="hidden" name="tournamentSlug" value={tournamentSlug}/><input type="hidden" name="registrationType" value={individual ? "INDIVIDUAL" : "PAIR"}/>
      <aside className={viewStyles.registration_summary} aria-label="Sua inscrição">
        <h2>Sua inscrição</h2>
        <div className={viewStyles.field}><label htmlFor="categoryId">Categoria</label><SmartEntitySelect label="Categoria" id="categoryId" name="categoryId" value={categoryId} onChange={event => setCategoryId(event.target.value)} className={viewStyles.public_reg_select} required><option value="">Selecione</option>{categories.map(category => <option key={category.id} value={category.id}>{formatCategoryName(category.name)}</option>)}</SmartEntitySelect></div>
        {onlinePaymentEnabled ? <div className={viewStyles.field}><label htmlFor="paymentMethod">Pagamento</label><select id="paymentMethod" name="paymentMethod" defaultValue="PIX" required><option value="PIX">PIX</option><option value="CARD">Cartão</option></select></div> : <p className={viewStyles.payment_notice}>Pagamento no local</p>}
        <dl className={viewStyles.summary_values}><div><dt>Modalidade</dt><dd>{individual ? "Individual" : trio ? "Trio" : categoryId ? "Dupla" : "Selecione a categoria"}</dd></div>{!onlinePaymentEnabled ? <div><dt>Por pessoa</dt><dd>{!selectedCategory ? "Selecione a categoria" : personPrices ? formatPersonPrice(personPrices[0]) : "A calcular"}</dd></div> : <div><dt>Valor</dt><dd>{state.amountCents != null ? (state.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "A calcular"}</dd></div>}</dl>
        {!onlinePaymentEnabled && hasPriceTiers && personPrices ? <div className={viewStyles.price_tiers}><p>Preço por pessoa, conforme suas inscrições no evento:</p><dl>{personPrices.map((price,index)=><div key={index}><dt>{index === 2 ? "3ª inscrição em diante" : `${index + 1}ª inscrição`}</dt><dd>{formatPersonPrice(price)}</dd></div>)}</dl></div> : null}
        {!onlinePaymentEnabled && discountActive ? <p className={viewStyles.payment_notice}>Desconto de até {formatPersonPrice(earlyDiscountCents)} no total da inscrição{earlyDiscountUntil ? ` até ${new Date(earlyDiscountUntil).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}. Os valores por pessoa acima são os preços base.</p> : null}
        <div className={viewStyles.desktop_submit}>{onlinePaymentEnabled ? <p className={viewStyles.payment_notice}>Se houver cobrança, a vaga ficará reservada por 1 hora e será confirmada após a aprovação.</p> : null}<SubmitButton label={onlinePaymentEnabled ? "Ir para pagamento" : "Confirmar inscrição"} pendingLabel="Criando inscrição..." className={viewStyles.button_button_primary}/></div>
      </aside>
      <div className={viewStyles.athlete_fields}>
        <section className={viewStyles.public_reg_card}><header className={viewStyles.public_reg_card_head}><h2>{individual ? "Atleta" : "Atleta 1"}</h2><span>Titular</span></header><div className={viewStyles.public_reg_grid_public_reg_grid_2}>
          <div className={cx(viewStyles.field, "tw:col-span-full")}><label htmlFor="leadName">Nome</label><input id="leadName" name="leadName" autoComplete="name" required/></div>
          {!individual ? <div className={cx(viewStyles.field, "tw:col-span-full")}><label htmlFor="leadEmail">E-mail</label><EmailInput id="leadEmail" name="leadEmail" required/></div> : null}
          <div className={cx(viewStyles.field, individual && "tw:col-span-full")}><label htmlFor="leadPhone">Telefone</label><PhoneInput pattern={"\\([0-9]{2}\\) [0-9]{4,5}-[0-9]{4}"} title="Informe o telefone com DDD." id="leadPhone" name="leadPhone" required/></div>
          {!individual ? <div className={viewStyles.field}><label htmlFor="leadCpf">CPF</label><CpfInput id="leadCpf" name="leadCpf" required/></div> : null}
        </div></section>
        {!individual ? <section className={viewStyles.public_reg_card}><header className={viewStyles.public_reg_card_head}><h2>Atleta 2</h2></header><div className={viewStyles.public_reg_grid_public_reg_grid_2}>
          <div className={cx(viewStyles.field, "tw:col-span-full")}><label htmlFor="partnerName">Nome</label><input id="partnerName" name="partnerName" required/></div>
          <div className={viewStyles.field}><label htmlFor="partnerPhone">Telefone</label><PhoneInput pattern={"\\([0-9]{2}\\) [0-9]{4,5}-[0-9]{4}"} title="Informe o telefone com DDD." id="partnerPhone" name="partnerPhone" required/></div>
          <div className={viewStyles.field}><label htmlFor="partnerCpf">CPF</label><CpfInput id="partnerCpf" name="partnerCpf" required/></div>
        </div></section> : null}
        {trio ? <section className={viewStyles.public_reg_card}><header className={viewStyles.public_reg_card_head}><h2>Atleta 3</h2></header><div className={viewStyles.public_reg_grid_public_reg_grid_2}>
          <div className={cx(viewStyles.field, "tw:col-span-full")}><label htmlFor="thirdName">Nome</label><input id="thirdName" name="thirdName" required/></div>
          <div className={viewStyles.field}><label htmlFor="thirdPhone">Telefone</label><PhoneInput pattern={"\\([0-9]{2}\\) [0-9]{4,5}-[0-9]{4}"} title="Informe o telefone com DDD." id="thirdPhone" name="thirdPhone" required/></div>
          <div className={viewStyles.field}><label htmlFor="thirdCpf">CPF</label><CpfInput id="thirdCpf" name="thirdCpf" required/></div>
        </div></section> : null}
        <BotTrap/>
        <p className={viewStyles.privacy_notice}>{individual ? "Consulte as condições da arena e a política de privacidade antes de continuar." : "O CPF identifica o atleta e evita inscrições duplicadas no cálculo dos preços por categoria. Consulte as condições da arena e a política de privacidade antes de continuar."}</p>
        {!individual ? <details className={viewStyles.privacy_notice}><summary>Uso dos dados da equipe</summary><p>Nome e resultados da equipe poderão aparecer na competição. Informe os demais atletas sobre o uso desses dados.</p>{trio ? <p>O total da equipe considera a inscrição de cada um dos três atletas.</p> : null}</details> : null}
    {!onlinePaymentEnabled && rules.trim() ? <section className={viewStyles.regulation} aria-labelledby="event-regulation-title"><h2 id="event-regulation-title">Regulamento</h2><p>{rules}</p></section> : null}
      </div>
      <div className={viewStyles.mobile_submit}>{onlinePaymentEnabled ? <p className={viewStyles.payment_notice}>Se houver cobrança, a vaga ficará reservada por 1 hora e será confirmada após a aprovação.</p> : null}<SubmitButton label={onlinePaymentEnabled ? "Ir para pagamento" : "Confirmar inscrição"} pendingLabel="Criando inscrição..." className={viewStyles.button_button_primary}/></div>
      {state?.error ? <p role="alert" className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? <div role="status" className={viewStyles.form_success_form_full_reveal_up}>{state.success} Referência: <strong>{state.paymentReference}</strong> · Valor: <strong>{((state.amountCents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><br/>Status: <strong>{state.registrationId ? "Pagamento pendente" : "Confirmado"}</strong></div> : null}
    </form>
    {responsibleName ? <p className={viewStyles.privacy_notice}>Contato da organização: {responsibleName}{responsiblePhone ? ` · ${responsiblePhone}` : ""}</p> : null}
    <footer className="tw:min-w-0 tw:py-2"><ArenaLegalLinks arenaSlug={arenaSlug}/></footer>
  </div>;
}
