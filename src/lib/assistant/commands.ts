import { parseMoneyToCents } from "@/lib/finance/inputs";

export type ArenaAssistantCommand = {
  type: "CREATE_RECEIVABLE_INVOICE";
  clientName: string;
  amountCents: number;
  dueDate: "TODAY";
};

const invoicePattern = /^(?:crie|criar|gere|gerar)\s+(?:uma\s+)?fatura\s+(?:no\s+)?valor\s+(?:de\s+)?(?:r\$\s*)?([\d.,]+)\s+para\s+(?:o\s+)?cliente\s+(.+?)(?:\s+com\s+(?:a\s+)?data\s+hoje)?\.?$/i;

export function parseArenaAssistantCommand(input: string): ArenaAssistantCommand | null {
  const match = input.trim().match(invoicePattern);
  if (!match) return null;

  const rawClientName = match[2]?.trim().replace(/[.]$/, "") ?? "";
  const todaySuffixIndex = rawClientName.toLocaleLowerCase("pt-BR").lastIndexOf(" com a data de hoje");
  const clientName = (todaySuffixIndex >= 0 ? rawClientName.slice(0, todaySuffixIndex) : rawClientName).trim();
  if (!clientName) return null;

  try {
    const amountCents = parseMoneyToCents(match[1]);
    if (amountCents <= 0) return null;

    return {
      type: "CREATE_RECEIVABLE_INVOICE",
      clientName,
      amountCents,
      dueDate: "TODAY"
    };
  } catch {
    return null;
  }
}
