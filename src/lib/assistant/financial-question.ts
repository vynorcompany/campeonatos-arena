export function financialQuestion(text: string) {
  const normalize = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const details = /\b(?:liste|listar|listagem|detalh\w*|quais|quem)\b/.test(normalize);
  if (/inadimpl|devedor|atrasad|vencid/.test(normalize) && !/inclu|tambem| e /.test(normalize)) return { mode: "overdue" as const, permission: "finance:receivable:view", details };
  if (/a pagar|para pagar|pra pagar|(?:tenho|tem|preciso|vamos).*pagar/.test(normalize)) return { mode: "payable" as const, permission: "finance:payable:view", details };
  if (/a receber|para receber|pra receber|(?:para|pra|a) entrar|(?:tem|tenho|previst|falta).*entrar|saldo a entrar|(?:vai|vamos|deve|ira).*entrar|(?:vai|vamos|deve|ira|previst|falta).*receber/.test(normalize)) return { mode: "receivable" as const, permission: "finance:receivable:view", details };
  if (/fluxo|caixa|financeiro|resultado|categoria|forma.*pagamento|quadra/.test(normalize)) return { mode: "cashflow" as const, permission: "finance:reports:view", details };
  if (/recebid|entrou|entraram|recebimento|receita|faturamento|entradas/.test(normalize)) return { mode: "received" as const, permission: "finance:receivable:view", details };
  if (/despesa|pagou|pagamos|pago|saidas|pagamentos/.test(normalize)) return { mode: "spent" as const, permission: "finance:payable:view", details };
  return null;
}
