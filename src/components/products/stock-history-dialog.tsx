"use client";

import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

type Movement = { id: string; type: string; quantity: number; reason: string; createdAt: string };
const movementLabels: Record<string, string> = { IN: "Entrada", OUT: "Saída", ADJUST: "Contagem" };

export function StockHistoryDialog({ movements }: { movements: Movement[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className={`${ui.secondary} tw:mt-3 tw:justify-self-start`} onClick={() => setOpen(true)}>Ver histórico</button>
    <Modal title="Histórico de estoque" width="tw:max-w-[560px]" open={open} onClose={close}>
      {movements.length ? <ul className="tw:m-0 tw:grid tw:list-none tw:gap-0 tw:p-0">{movements.map(movement => <li key={movement.id} className="tw:grid tw:min-w-0 tw:gap-1 tw:border-b tw:border-[var(--line)] tw:py-3 tw:first:pt-0 tw:last:border-b-0">
        <div className="tw:flex tw:flex-wrap tw:items-baseline tw:justify-between tw:gap-2"><strong className="tw:text-sm tw:text-[#174983]">{movementLabels[movement.type] ?? movement.type} · {movement.quantity} unidade(s)</strong><time dateTime={movement.createdAt} className="tw:text-xs tw:text-[var(--muted)]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(movement.createdAt))}</time></div>
        <span className="tw:break-words tw:text-sm">{movement.reason || "Sem observação"}</span>
      </li>)}</ul> : <p className={ui.empty}>Nenhuma movimentação registrada.</p>}
    </Modal>
  </>;
}
