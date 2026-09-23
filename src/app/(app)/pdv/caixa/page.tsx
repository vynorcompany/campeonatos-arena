import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { MoneyInput } from "@/components/forms/money-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import styles from "./page.module.css";
import { closeCashRegisterAction, createCashMovementAction, openCashRegisterAction } from "@/lib/actions/cash-register";
import { requireModuleView } from "@/lib/auth/guards";
import { cashReferenceDate } from "@/lib/finance/cash-day";
import { withArenaTransaction } from "@/lib/rls";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

function CurrencyField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return <label className="field"><span>{label}</span><span className={styles.currencyInput}><span>R$</span><MoneyInput name={name} defaultValue={defaultValue} placeholder="0,00" required aria-label={`${label} em reais`} /></span></label>;
}

export default async function CashRegisterPage() {
  const auth = await requireModuleView("pos");
  const register = await withArenaTransaction(auth.arenaId, (tx) => tx.cashRegister.findUnique({ where: { arenaId_referenceDate: { arenaId: auth.arenaId, referenceDate: cashReferenceDate() } }, include: { movements: { orderBy: { createdAt: "desc" } } } }));
  const isOpen = register?.status === "OPEN";

  return <div className={`stack-md cash-register-page ${styles.page}`}>
    <h1 className="sr-only">Gerenciar Caixa</h1>
    <div className={styles.toolbar}><span className={`${styles.status} ${isOpen ? styles.open : ""}`}><span aria-hidden="true" />{isOpen ? "Caixa aberto" : register ? "Caixa encerrado" : "Caixa fechado"}</span><div className={styles.shortcuts}><Link className="button button-small" href="/pdv">Produtos e serviços</Link><Link className="button button-small" href="/relatorios/caixa">Relatório de caixa</Link></div></div>
    {register ? <section className={styles.summaryGrid} aria-label="Resumo do caixa"><article><span>Fundo inicial</span><strong>{money(register.openingAmountCents)}</strong></article><article><span>Saldo esperado</span><strong>{money(register.expectedAmountCents)}</strong></article><article><span>{isOpen ? "Movimentações" : "Valor contado"}</span><strong>{isOpen ? register.movements.length : money(register.countedAmountCents ?? 0)}</strong></article>{!isOpen ? <article><span>Diferença</span><strong>{money(register.differenceCents ?? 0)}</strong></article> : null}</section> : null}
    {!register ? <SectionCard title="Abertura de caixa" description="Informe o valor disponível no início da operação de hoje."><SafeActionForm action={openCashRegisterAction} className={styles.form} successMessage="Caixa aberto."><CurrencyField name="openingAmount" label="Fundo inicial" defaultValue="0,00" /><label className="field"><span>Observação de abertura</span><input name="openingNotes" placeholder="Ex.: troco inicial" /></label><div className={styles.formActions}><SubmitButton className="button button-primary" label="Abrir caixa" pendingLabel="Abrindo..." /></div></SafeActionForm></SectionCard> : null}
    {register && !isOpen ? <SectionCard title="Operação encerrada" description="Este caixa já foi fechado. O próximo poderá ser aberto amanhã."><p className="muted">Consulte as movimentações e os valores no relatório de caixa.</p></SectionCard> : null}
    {register && isOpen ? <><div className={styles.operationGrid}><SectionCard title="Registrar movimentação" description="Entradas de suprimento ou retiradas de sangria."><SafeActionForm action={createCashMovementAction} className={styles.form} resetOnSuccess successMessage="Movimentação registrada."><input type="hidden" name="registerId" value={register.id} /><label className="field"><span>Tipo</span><select name="type"><option value="SUPPLY">Suprimento</option><option value="WITHDRAWAL">Sangria</option></select></label><CurrencyField name="amount" label="Valor" /><label className="field"><span>Descrição</span><input name="description" placeholder="Ex.: retirada para depósito" /></label><div className={styles.formActions}><SubmitButton className="button button-primary" label="Registrar" pendingLabel="Registrando..." /></div></SafeActionForm></SectionCard><SectionCard title="Fechamento de caixa" description="Confira o dinheiro contado antes de encerrar o dia."><SafeActionForm action={closeCashRegisterAction} className={styles.form} successMessage="Caixa encerrado."><input type="hidden" name="registerId" value={register.id} /><CurrencyField name="countedAmount" label="Valor contado" /><label className="field"><span>Observação de fechamento</span><input name="closingNotes" placeholder="Ex.: diferença justificada" /></label><div className={styles.formActions}><SubmitButton className="button button-danger" label="Fechar caixa" pendingLabel="Fechando..." /></div></SafeActionForm></SectionCard></div><SectionCard title="Movimentações de hoje"><div className={styles.movementList}>{register.movements.map((item) => <article key={item.id}><span><strong>{item.type === "SUPPLY" ? "Suprimento" : item.type === "SALE" ? "Venda" : "Sangria"}</strong><small>{item.description || "Sem observação"}</small></span><b className={item.amountCents < 0 ? styles.negative : styles.positive}>{item.amountCents < 0 ? "−" : "+"}{money(Math.abs(item.amountCents))}</b></article>)}{!register.movements.length ? <p className="muted">Nenhuma movimentação registrada.</p> : null}</div></SectionCard></> : null}
  </div>;
}
