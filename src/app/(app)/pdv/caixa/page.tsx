import Link from "next/link";
import { CheckoutRegister } from "@/components/pos/checkout-register";
import { requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export default async function CheckoutPage() {
  const auth = await requireModuleView("pos");
  const [products, salesToday] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.product.findMany({
      where: {
        arenaId: auth.arenaId,
        active: true
      },
      orderBy: { name: "asc" }
    }),
    tx.sale.findMany({
      where: {
        arenaId: auth.arenaId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]));
  const totalToday = salesToday.reduce((total, sale) => total + sale.totalCents, 0);

  return (
    <div className="stack-md">
      <header className="page-header checkout-header">
        <div className="stack-xs">
          <p className="eyebrow">PDV</p>
          <h1>Caixa de venda</h1>
          <p className="muted">Adicione os produtos comprados, confira o carrinho e finalize em uma única venda.</p>
        </div>
        <div className="checkout-header-actions">
          <div className="checkout-day-total">
            <span>Hoje</span>
            <strong>{formatMoney(totalToday)}</strong>
          </div>
          <Link href="/pdv" className="button">
            Voltar ao estoque
          </Link>
        </div>
      </header>

      <CheckoutRegister
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          priceCents: product.priceCents,
          stockQuantity: product.stockQuantity
        }))}
      />
    </div>
  );
}
