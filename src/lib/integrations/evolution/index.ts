export type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  webhookSecret: string;
};

export type EvolutionEnvironment = {
  apiUrl?: string;
  apiKey?: string;
  instanceName?: string;
  webhookSecret?: string;
};

export function resolveEvolutionConfig(settings: EvolutionEnvironment): EvolutionConfig | null {
  const config = {
    apiUrl: settings.apiUrl?.trim() ?? "",
    apiKey: settings.apiKey?.trim() ?? "",
    instanceName: settings.instanceName?.trim() ?? "",
    webhookSecret: settings.webhookSecret?.trim() ?? ""
  };
  const values = Object.values(config);
  if (values.every((value) => !value)) return null;
  if (values.some((value) => !value)) throw new Error("A configuração da Evolution está incompleta.");

  return { ...config, apiUrl: config.apiUrl.replace(/\/$/, "") };
}

export function evolutionRecipientNumber(phone: string) {
  if (phone.endsWith("@g.us")) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) throw new Error("Telefone inválido para envio pelo WhatsApp.");
  // DDD 55 is a domestic area code when the number has 10 or 11 digits.
  return !phone.trim().startsWith("+") && !phone.includes("@") && (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;
}

export function buildEvolutionTextPayload(phone: string, text: string) {
  const number = evolutionRecipientNumber(phone);
  const message = text.trim();
  if (!message) throw new Error("Mensagem vazia.");

  return { number, text: message };
}
