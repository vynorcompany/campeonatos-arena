import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { loadVisibleProductNames, visibleProductName } from "@/lib/products/visible-product-names";

const paymentLabels: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  CASH: "Dinheiro",
  OTHER: "Outro"
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export default async function SalesPage() {
  const auth = await requireModuleView("pos");
  const { sales, stockMovements, productNames } = await withArenaTransaction(auth.arenaId, async (tx) => {
    const [sales, stockMovements] = await Promise.all([tx.sale.findMany({
      where: { arenaId: auth.arenaId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 40
    }), tx.stockMovement.findMany({
      where: { arenaId: auth.arenaId },
      orderBy: { createdAt: "desc" },
      take: 24
    })]);
    const productNames = await loadVisibleProductNames(tx, auth.arenaId, [
      ...sales.flatMap((sale) => sale.items.map((item) => item.productId)),
      ...stockMovements.map((movement) => movement.productId)
    ]);
    return { sales, stockMovements, productNames };
  });

  return (
    <div className={viewStyles.stack_md}>
      <h1 className="tw:sr-only">Vendas</h1>

      <div className={viewStyles.two_column_grid}>
        <SectionCard title="Últimas vendas" description="Histórico recente da frente de caixa." hideHeading>
          <div className={viewStyles.simple_list}>
            {sales.map((sale) => (
              <div className={viewStyles.simple_item} key={sale.id}>
                <strong>{sale.code}</strong>
                <span>
                  {formatMoney(sale.totalCents)} - {paymentLabels[sale.paymentMethod] ?? sale.paymentMethod} - {formatDate(sale.createdAt)}
                </span>
                <span>{sale.items.map((item) => `${item.quantity}x ${visibleProductName(productNames, item.productId)}`).join(", ")}</span>
              </div>
            ))}
            {!sales.length ? <p className={viewStyles.muted}>Nenhuma venda registrada ainda.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Movimentações de estoque" description="Entradas, saídas, vendas e ajustes manuais." hideHeading>
          <div className={viewStyles.simple_list}>
            {stockMovements.map((movement) => (
              <div className={viewStyles.simple_item} key={movement.id}>
                <strong>{visibleProductName(productNames, movement.productId)}</strong>
                <span>
                  {movement.type} {movement.quantity} un. - {movement.reason || "Sem motivo"} - {formatDate(movement.createdAt)}
                </span>
              </div>
            ))}
            {!stockMovements.length ? <p className={viewStyles.muted}>Nenhuma movimentação registrada ainda.</p> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
