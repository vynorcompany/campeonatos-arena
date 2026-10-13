const knownSendFailures = [
  /^A Evolution recusou o envio da mensagem \(\d{3}\)\.$/,
  /^O WhatsApp desta arena ainda não está conectado\.$/,
  /^Sem permissão para enviar mensagens no WhatsApp\.$/,
  /^Conversa não encontrada\.$/,
  /^Telefone inválido para envio pelo WhatsApp\.$/,
];

export function whatsAppSendFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return knownSendFailures.some((pattern) => pattern.test(message))
    ? message
    : "Não foi possível enviar a mensagem. Tente novamente ou informe o suporte.";
}
