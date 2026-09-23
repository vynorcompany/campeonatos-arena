export function classificationFilter(category: string): Record<string, unknown> {
  const normalized = category.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "plano de aulas" || normalized === "planos de aulas") {
    return { OR: [{ category: { in: ["Plano de Aulas", "Planos de aulas"], mode: "insensitive" } }, { planId: { not: null } }] };
  }
  if (normalized === "venda" || normalized === "vendas") {
    return { OR: [{ category: { in: ["Venda", "Vendas", "COMANDAS"], mode: "insensitive" } }, { saleId: { not: null } }] };
  }
  return { category: { equals: category, mode: "insensitive" } };
}
