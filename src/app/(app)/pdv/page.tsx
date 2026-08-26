import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export default async function PosPage() {
  const auth = await requireModuleView("pos");
  const products = await prisma.product.findMany({
    where: { arenaId: auth.arenaId },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });

  return (
    <div className="product-management stack-md">
      <header className="product-management-header">
        <h1>Produtos e Serviços</h1>
        <div className="product-management-actions">
          <button type="button" className="button button-import" disabled title="Importação de nota será disponibilizada em breve">Importar nota de compra</button>
          <button type="button" className="button button-import-csv" disabled title="Importação CSV será disponibilizada em breve">Importar CSV</button>
          <Link href="/pdv/novo" className="button button-primary">Criar produto/serviço</Link>
        </div>
      </header>

      <section className="product-management-filters" aria-label="Filtros de produtos">
        <header><strong>Filtros</strong><div><button type="button" className="button button-small button-primary">Aplicar filtros</button><button type="button" className="button button-small">Limpar</button></div></header>
        <div>
          <label>Descrição<input placeholder="Nome do produto" /></label>
          <label>Código interno<input placeholder="SKU/código" /></label>
          <label>Categoria<select defaultValue=""><option value="">Todas as categorias</option></select></label>
          <label>Estoque<select defaultValue=""><option value="">Todos os níveis</option><option value="low">Abaixo do mínimo</option><option value="available">Disponível</option></select></label>
          <label className="control-toggle"><input type="checkbox" defaultChecked /><span aria-hidden="true" /><em>Ativo</em></label>
        </div>
      </section>

      <SectionCard id="estoque" title="Listagem" description="Clique em um produto para configurar dados, estoque e NFC-e."><div className="product-list-head"><span>Produto</span><span>Preço de venda</span><span>Estoque</span><span>Mínimo</span><span>Ações</span></div><div className="product-list">{products.map((product) => <article className="product-row" key={product.id}><Link href={`/pdv/${product.id}`} className="product-table-link"><strong>{product.name}</strong><span>{product.sku || "Sem SKU"}</span></Link><span>{formatMoney(product.priceCents)}</span><span className={product.stockQuantity <= product.minStock ? "stock-alert" : ""}>{product.stockQuantity}</span><span>{product.minStock}</span><Link href={`/pdv/${product.id}`} className="button button-small">Abrir</Link></article>)}{!products.length ? <p className="client-empty">Nenhum produto cadastrado.</p> : null}</div></SectionCard>
    </div>
  );
}
