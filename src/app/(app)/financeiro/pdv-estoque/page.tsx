import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { getStockSummary } from "@/lib/products/stock-summary-data";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function FinancePdvStockPage() {
  const auth = await requireModuleView("stock");
  const { pdvRevenueCents: pdvRevenue, stockValueCents: stockValue, productCount, movements: stockMovements } = await getStockSummary(auth.arenaId);

  return (
    <div className={viewStyles.stack_md}>

      <div className={viewStyles.stats_grid}>
        <div className={viewStyles.stat_card}>
          <strong>{formatMoney(pdvRevenue)}</strong>
          <span>vendas do mês no PDV</span>
        </div>
        <div className={viewStyles.stat_card}>
          <strong>{formatMoney(stockValue)}</strong>
          <span>valor em estoque</span>
        </div>
        <div className={viewStyles.stat_card}>
          <strong>{productCount}</strong>
          <span>produtos cadastrados</span>
        </div>
      </div>

      <SectionCard title="Movimentações do mês" description="Entradas, saídas, vendas e ajustes de estoque." hideHeading>
        <div className={viewStyles.simple_list}>
          {stockMovements.map((movement) => (
            <div className={viewStyles.simple_item} key={movement.id}>
              <strong>{movement.productName}</strong>
              <span>
                {movement.type} de {movement.quantity} un. - {movement.reason || "Sem motivo"}
              </span>
            </div>
          ))}
          {!stockMovements.length ? <p className={viewStyles.muted}>Nenhuma movimentação de estoque neste mês.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
