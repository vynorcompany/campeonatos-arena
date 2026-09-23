import { revalidatePath } from "next/cache";

export function refreshFinanceRoutes() {
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/lancamentos");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/professores");
}

export function refreshFinancialSettings() {
  revalidatePath("/financeiro/configuracoes");
  revalidatePath("/financeiro/configuracoes/categorias-financeiras");
  revalidatePath("/financeiro/configuracoes/formas-pagamento");
  revalidatePath("/financeiro/configuracoes/contas-bancarias");
  revalidatePath("/financeiro/configuracoes/fornecedores");
  revalidatePath("/financeiro/configuracoes/categorias-produtos");
  revalidatePath("/financeiro/configuracoes/cupons");
  revalidatePath("/financeiro/configuracoes/notas-fiscais");
  revalidatePath("/financeiro/configuracoes/pagamentos-online");
  revalidatePath("/pdv");
  revalidatePath("/pdv/novo");
  revalidatePath("/pdv/estoque");
}
