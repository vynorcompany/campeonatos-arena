"use client";
import { viewStyles } from "./stock-history-dialog.utilities";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Movement = { id: string; type: string; quantity: number; reason: string; createdAt: string };
export function StockHistoryDialog({ movements }: { movements: Movement[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const modal = open ? <div className={viewStyles.command_modal_backdrop} onMouseDown={() => setOpen(false)}><section className={viewStyles.financial_entry_modal_financial_entry_modal_small} role="dialog" aria-modal="true" aria-label="Histórico de estoque" onMouseDown={(event) => event.stopPropagation()}><header><div><span>ESTOQUE</span><h2>Histórico de estoque</h2></div><button type="button" className={viewStyles.button_button_small} onClick={() => setOpen(false)}>Fechar</button></header><div className={viewStyles.simple_list}>{movements.length ? movements.map((movement) => <div className={viewStyles.simple_item} key={movement.id}><strong>{movement.type} · {movement.quantity} unidade(s)</strong><span>{movement.reason || "Sem observação"} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(movement.createdAt))}</span></div>) : <p className={viewStyles.muted}>Nenhuma movimentação registrada.</p>}</div></section></div> : null;
  return <><button type="button" className={viewStyles.button_button_small_product_history_trigger} onClick={() => setOpen(true)}>Ver histórico</button>{mounted && modal ? createPortal(modal, document.body) : null}</>;
}
