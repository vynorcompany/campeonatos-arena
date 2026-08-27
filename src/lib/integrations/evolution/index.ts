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

export function buildEvolutionTextPayload(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) throw new Error("Telefone inválido para envio pelo WhatsApp.");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const message = text.trim();
  if (!message) throw new Error("Mensagem vazia.");

  return { number, textMessage: { text: message } };
}
