import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

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
  const [sales, stockMovements] = await Promise.all([
    prisma.sale.findMany({
      where: { arenaId: auth.arenaId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.stockMovement.findMany({
      where: { arenaId: auth.arenaId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 24
    })
  ]);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">PDV</p>
          <h1>Vendas</h1>
          <p className="muted">Consulte o histórico de vendas e movimentações de estoque geradas pelo caixa.</p>
        </div>
      </header>

      <div className="two-column-grid">
        <SectionCard title="Últimas vendas" description="Histórico recente da frente de caixa.">
          <div className="simple-list">
            {sales.map((sale) => (
              <div className="simple-item" key={sale.id}>
                <strong>{sale.code}</strong>
                <span>
                  {formatMoney(sale.totalCents)} - {paymentLabels[sale.paymentMethod] ?? sale.paymentMethod} - {formatDate(sale.createdAt)}
                </span>
                <span>{sale.items.map((item) => `${item.quantity}x ${item.product.name}`).join(", ")}</span>
              </div>
            ))}
            {!sales.length ? <p className="muted">Nenhuma venda registrada ainda.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Movimentações de estoque" description="Entradas, saídas, vendas e ajustes manuais.">
          <div className="simple-list">
            {stockMovements.map((movement) => (
              <div className="simple-item" key={movement.id}>
                <strong>{movement.product.name}</strong>
                <span>
                  {movement.type} {movement.quantity} un. - {movement.reason || "Sem motivo"} - {formatDate(movement.createdAt)}
                </span>
              </div>
            ))}
            {!stockMovements.length ? <p className="muted">Nenhuma movimentação registrada ainda.</p> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
