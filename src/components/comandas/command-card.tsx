"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComandaProductAction, finishComandaAction, updateComandaItemQuantityAction } from "@/lib/actions/comanda";

type Product = { id: string; name: string; priceCents: number; stockQuantity: number; category?: { name: string } | null };
type CommandItem = { id: string; quantity: number; totalCents: number; product: { name: string } };
type Payment = { id: number; paymentMethod: string; amount: string };

function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }
function toCents(value: string) { return Math.round(Number(value.replace(",", ".")) * 100) || 0; }

export function CommandCard({ comanda, products, paymentMethods }: { comanda: { id: string; code: string; label: string; type: string; playerName?: string | null; items: CommandItem[] }; products: Product[]; paymentMethods: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");
  const totalCents = comanda.items.reduce((total, item) => total + item.totalCents, 0);
  const paymentTotalCents = payments.reduce((total, payment) => total + toCents(payment.amount), 0);
  const remainingCents = Math.max(0, totalCents - paymentTotalCents);
  const productsByCategory = useMemo(() => products.reduce<Record<string, Product[]>>((groups, product) => {
    const categoryName = product.category?.name ?? "Sem categoria";
    (groups[categoryName] ??= []).push(product);
    return groups;
  }, {}), [products]);
  const run = (operation: () => Promise<void>, success?: () => void) => startTransition(async () => { try { setMessage(""); await operation(); success?.(); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a comanda."); } });
  const form = (values: Record<string, string>) => { const data = new FormData(); Object.entries(values).forEach(([key, value]) => data.set(key, value)); return data; };
  const changeQuantity = (productId: string, value: number) => setQuantities((current) => ({ ...current, [productId]: Math.max(0, Math.min(value, products.find((product) => product.id === productId)?.stockQuantity ?? 0)) }));
  const addSelectedProducts = () => run(async () => {
    const selected = Object.entries(quantities).filter(([, quantity]) => quantity > 0);
    if (!selected.length) throw new Error("Selecione ao menos um produto.");
    for (const [productId, quantity] of selected) await addComandaProductAction(form({ comandaId: comanda.id, productId, quantity: String(quantity) }));
  }, () => { setQuantities({}); setProductModalOpen(false); });
  const addPayment = () => setPayments((current) => [...current, { id: Date.now(), paymentMethod: paymentMethods[0] ?? "PIX", amount: "" }]);
  const finish = () => run(() => finishComandaAction(form({ comandaId: comanda.id, payments: JSON.stringify(payments.map((payment) => ({ paymentMethod: payment.paymentMethod, amountCents: toCents(payment.amount) })).filter((payment) => payment.amountCents > 0)) })), () => setCheckoutOpen(false));

  return <article className="command-card">
    <header><div><strong>{comanda.label}</strong><span>{comanda.type === "AVULSA" ? "Avulsa" : comanda.playerName ?? "Cliente"}</span></div><small>{comanda.code}</small></header>
    <div className="command-items">{comanda.items.length ? comanda.items.map((item) => <div className="command-item" key={item.id}><span><b>{item.quantity}×</b> {item.product.name}</span><strong>{money(item.totalCents)}</strong><div className="command-item-controls"><button type="button" aria-label={`Diminuir ${item.product.name}`} onClick={() => run(() => updateComandaItemQuantityAction(form({ itemId: item.id, delta: "-1" })))} disabled={pending}>−</button><button type="button" aria-label={`Aumentar ${item.product.name}`} onClick={() => run(() => updateComandaItemQuantityAction(form({ itemId: item.id, delta: "1" })))} disabled={pending}>+</button></div></div>) : <p className="command-items-empty">Nenhum produto inserido.</p>}</div>
    <footer><div><span>Total atual</span><strong>{money(totalCents)}</strong></div><div className="command-card-actions"><button type="button" className="button" onClick={() => setProductModalOpen(true)}>Inserir produtos</button><button type="button" className="button button-success" disabled={pending || !comanda.items.length} onClick={() => setCheckoutOpen(true)}>Finalizar comanda</button></div></footer>{message ? <p className="command-card-message">{message}</p> : null}

    {productModalOpen ? <div className="command-modal-backdrop" role="presentation" onMouseDown={() => setProductModalOpen(false)}><section className="command-product-modal" role="dialog" aria-modal="true" aria-label="Produtos em estoque" onMouseDown={(event) => event.stopPropagation()}><header><div><span>ESTOQUE</span><h2>Produtos em estoque</h2></div><button type="button" className="button button-small" onClick={() => setProductModalOpen(false)}>Fechar</button></header><div className="command-product-categories">{Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => <section key={categoryName}><h3>{categoryName}</h3><div>{categoryProducts.map((product) => <article key={product.id} className={product.stockQuantity ? "command-product-row" : "command-product-row command-product-row-disabled"}><div><strong>{product.name}</strong><span>{money(product.priceCents)} · {product.stockQuantity} em estoque</span></div><label>Quantidade<input type="number" min="0" max={product.stockQuantity} value={quantities[product.id] ?? 0} disabled={!product.stockQuantity} onChange={(event) => changeQuantity(product.id, Number(event.target.value))} /></label></article>)}</div></section>)}</div><footer><button type="button" className="button" onClick={() => setProductModalOpen(false)}>Cancelar</button><button type="button" className="button button-primary" disabled={pending} onClick={addSelectedProducts}>Adicionar selecionados</button></footer></section></div> : null}

    {checkoutOpen ? <div className="command-modal-backdrop" role="presentation" onMouseDown={() => setCheckoutOpen(false)}><section className="command-checkout-modal" role="dialog" aria-modal="true" aria-label="Finalizar comanda" onMouseDown={(event) => event.stopPropagation()}><header><div><span>FINALIZAÇÃO</span><h2>Finalizar comanda</h2></div><button type="button" className="button button-small" onClick={() => setCheckoutOpen(false)}>Fechar</button></header><div className="command-checkout-grid"><section><h3>Resumo da comanda</h3><dl><div><dt>Cliente</dt><dd>{comanda.label}</dd></div><div><dt>Itens</dt><dd>{comanda.items.reduce((total, item) => total + item.quantity, 0)} produto(s)</dd></div><div><dt>Total</dt><dd>{money(totalCents)}</dd></div></dl></section><section><div className="command-checkout-payment-head"><div><h3>Formas de pagamento</h3><p>Divida o valor entre quantas formas precisar.</p></div><button type="button" className="button button-small" onClick={addPayment}>Adicionar forma de pagamento</button></div>{payments.length ? <div className="command-payment-list">{payments.map((payment) => <div key={payment.id} className="command-payment-row"><select value={payment.paymentMethod} onChange={(event) => setPayments((current) => current.map((item) => item.id === payment.id ? { ...item, paymentMethod: event.target.value } : item))}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select><input inputMode="decimal" value={payment.amount} placeholder="0,00" onChange={(event) => setPayments((current) => current.map((item) => item.id === payment.id ? { ...item, amount: event.target.value } : item))} /><button type="button" aria-label="Remover forma de pagamento" onClick={() => setPayments((current) => current.filter((item) => item.id !== payment.id))}>×</button></div>)}</div> : <p className="command-checkout-warning">Nenhuma forma de pagamento informada. A conta será criada em aberto no Contas a Receber.</p>}<div className="command-checkout-totals"><span>Recebido: <strong>{money(paymentTotalCents)}</strong></span><span>Conta a receber: <strong>{money(remainingCents)}</strong></span></div></section></div><footer><button type="button" className="button" onClick={() => setCheckoutOpen(false)}>Cancelar</button><button type="button" className="button button-success" disabled={pending || paymentTotalCents > totalCents} onClick={finish}>{remainingCents ? "Finalizar e deixar saldo em aberto" : "Confirmar pagamento"}</button></footer></section></div> : null}
  </article>;
}
