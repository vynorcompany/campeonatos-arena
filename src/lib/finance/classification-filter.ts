export function classificationFilter(category: string): Record<string, unknown> {
  const normalized = category.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "plano de aulas" || normalized === "planos de aulas") {
    return { OR: [{ category: { in: ["Plano de Aulas", "Planos de aulas"], mode: "insensitive" } }, { planId: { not: null } }] };
  }
  if (normalized === "reserva" || normalized === "reservas") return { category: { in: ["Reserva", "Reservas"], mode: "insensitive" } };
  if (normalized === "comanda" || normalized === "comandas") return { category: { in: ["Comanda", "Comandas"], mode: "insensitive" } };
  if (normalized === "venda" || normalized === "vendas") {
    return { OR: [{ category: { in: ["Venda", "Vendas", "COMANDAS"], mode: "insensitive" } }, { saleId: { not: null } }] };
  }
  return { category: { equals: category, mode: "insensitive" } };
}

export function classificationFilterOptions(categories: string[], type: "REVENUE" | "EXPENSE") {
  const options = type === "REVENUE" ? ["Plano de Aulas", "Vendas", "Reservas", "Comandas", ...categories] : categories;
  const labels = options.map(option => type === "REVENUE" && ["reserva", "reservas"].includes(option.trim().toLocaleLowerCase("pt-BR")) ? "Reservas" : type === "REVENUE" && ["comanda", "comandas"].includes(option.trim().toLocaleLowerCase("pt-BR")) ? "Comandas" : option.trim()).filter(Boolean);
  return labels.filter((option, index) =>
    labels.findIndex((candidate) => candidate.toLocaleLowerCase("pt-BR") === option.toLocaleLowerCase("pt-BR")) === index,
  );
}
