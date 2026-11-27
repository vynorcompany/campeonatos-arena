import { auditFinancialOperation } from "./presentation";
const labels: Record<string, string> = { COURT_CHECKIN: "Check-in confirmado", COMANDA_DELETED: "Comanda excluída", COMANDA_SPLIT: "Comanda dividida", AGENT_KEY_CREATED: "Chave de agente criada", AGENT_KEY_REVOKED: "Chave de agente revogada", FINANCIAL_ENTRY_CREATED: "Lançamento financeiro criado", PAGE_VIEW: "Acesso à página" };
const verbs: Record<string, string> = { create: "Criar", update: "Atualizar", save: "Salvar", delete: "Excluir", remove: "Remover", add: "Adicionar", insert: "Inserir", open: "Abrir", close: "Fechar", finish: "Finalizar", cancel: "Cancelar", confirm: "Confirmar", login: "Entrar", logout: "Sair", register: "Cadastrar", send: "Enviar", request: "Solicitar", toggle: "Alterar", connect: "Conectar", revoke: "Revogar", reconcile: "Conciliar", upsert: "Salvar" };
const targets: Record<string, string> = { FinancialEntry: "lançamento financeiro", ScheduleOccurrence: "reserva de horário", ScheduleBookingSeries: "reserva fixa", ArenaServicePrice: "serviço", PaymentMethodSetting: "forma de pagamento", Court: "quadra", Supplier: "fornecedor", FinancialSetting: "cadastro financeiro", CashRegister: "caixa", CashMovement: "movimentação de caixa", StandardServicePrice: "preço de serviço", OnlineBookingSettings: "agendamento online", CourtBooking: "reserva de quadra", BookingComandas: "comandas da reserva", PublicClient: "cliente do portal", PublicPlayerProfile: "perfil do atleta", PublicCourtBooking: "reserva online", PublicCourtBookingRequest: "solicitação de reserva online", SponsorInPlan: "empresa no plano", TvSponsor: "empresa patrocinadora", TvPresentationSettings: "configuração da TV", Comanda: "comanda", ComandaItem: "item da comanda", Player: "cliente", Tournament: "torneio", Category: "categoria", Product: "produto", ProductCategory: "categoria de produto", FinancialCategory: "categoria financeira", Coupon: "cupom", User: "usuário", PermissionProfile: "perfil de permissões", Teacher: "professor", Lesson: "aula", Notification: "notificação", ScheduleServiceReservation: "serviço reservado", FinancialSettlement: "quitação de lançamento", Sale: "venda", SalePayment: "pagamento de venda", ClientBalanceMovement: "movimentação de saldo", AgentApiKey: "chave de agente" };
export function actionLabel(action: string, details: Record<string, unknown> = {}) {
  const financialOperation = auditFinancialOperation(action, details);
  if (financialOperation) return financialOperation;
  if (action === "DB:CREATE:Comanda") return "Comanda aberta";
  if (action === "DB:DELETE:Comanda") return "Comanda excluída";
  if (action === "DB:UPDATE:Comanda" && details.after && typeof details.after === "object" && "status" in details.after && details.after.status === "CLOSED") return "Comanda fechada";
  if (action === "DB:DELETE:ScheduleOccurrence") return "Horário excluído";
  if (labels[action]) return labels[action];
  if (action.startsWith("DB:")) {
    const [, operation, model] = action.split(":");
    const verb = ({ CREATE: "Inclusão", UPDATE: "Alteração", DELETE: "Exclusão" } as Record<string, string>)[operation] ?? operation;
    return `${verb} · ${targets[model] ?? model}`;
  }
  if (action.startsWith("API:")) return `Requisição à API · ${action.slice(4)}`;
  if (action.startsWith("REQUEST:")) return `Requisição · ${action.slice(8)}`;
  if (action.startsWith("ACTION:")) {
    const words = action.slice(7).replace(/Action$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").split(" ");
    return `Solicitação · ${verbs[words[0].toLowerCase()] ?? words[0]} ${targets[words.slice(1).join("")] ?? words.slice(1).join(" ")}`.trim();
  }
  return action;
}
