import { FinanceOperationError } from "@/lib/finance/action-error";
import { ProductOperationError } from "@/lib/backend/product-operation-error";
/** Only intentional validation failures may cross the HTTP boundary. */
export class ComandaOperationError extends Error {}
const safeComandaMessages = new Set([
  "Configure a emissão fiscal manual antes de emitir um documento.",
  "Sem permissão",
  "Sem permissão para executar esta ação.",
  "A abertura de comanda está bloqueada por pagamentos vencidos deste cliente.",
  "A arena desativou comandas pelo Portal. Procure a recepção.",
  "A comanda não está disponível para exclusão.",
  "A soma das partes deve ser igual ao valor da comanda.",
  "Abra o caixa do dia antes de receber o pagamento da comanda.",
  "Cada pessoa deve aparecer uma única vez na divisão.",
  "Cliente não encontrado.",
  "Comanda não está disponível.",
  "Divisão inválida.",
  "Esta arena exige quitação integral. Autorize o saldo pendente para continuar.",
  "Esta comanda não está disponível.",
  "Esta comanda não está mais aberta.",
  "Este pedido já foi enviado com outros itens. Atualize a comanda.",
  "Este pedido não está mais pendente.",
  "Este serviço já está lançado com outra duração. Remova o item antes de alterar o período.",
  "Informe valores válidos para a divisão.",
  "Não foi possível distribuir os centavos da divisão.",
  "O troco deve ser coberto pelo valor recebido em dinheiro. Ajuste os pagamentos ou escolha gerar saldo.",
  "Os pagamentos e o saldo utilizado excedem as partes da comanda.",
  "Os pagamentos não podem ultrapassar o total a receber.",
  "Pedido não encontrado nesta arena.",
  "Produto indisponível na quantidade solicitada.",
  "Produto não encontrado.",
  "Quantidade ou valor acima do limite permitido.",
  "Revise os produtos e quantidades do pedido.",
  "Seleção de itens inválida para divisão.",
  "Um dos produtos está indisponível na quantidade solicitada. Revise seu pedido.",
  "Valores de pagamento inválidos.",
  "Valores inválidos para divisão.",
  "Vincule um cliente para registrar crédito de pagamento excedente."
]);
export function publicComandaError(error: unknown): string | null {
  if (error instanceof ComandaOperationError || error instanceof FinanceOperationError || error instanceof ProductOperationError) return error.message;
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
  if (safeComandaMessages.has(message) || /^Este cadastro precisa de revisão da recepção antes de abrir uma comanda\. Protocolo: [A-Za-z0-9_-]{1,128}\.$/.test(message)) return message;
  return null;
}
