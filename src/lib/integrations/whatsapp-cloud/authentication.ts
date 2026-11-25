import { normalizeBrazilianPhone } from "@/lib/phone";

type CloudAuthenticationConfig = {
  accessToken?: string;
  phoneNumberId?: string;
  templateName?: string;
  language?: string;
  apiVersion?: string;
};

/** Server caller supplies secrets; no credential or provider response is logged. */
export async function sendCloudAuthenticationCode(phone: string, code: string, config: CloudAuthenticationConfig, transport: typeof fetch = fetch) {
  const { accessToken, phoneNumberId, templateName = "portal_codigo_acesso", language = "pt_BR", apiVersion = "v25.0" } = config;
  const normalized = normalizeBrazilianPhone(phone);
  if (!accessToken?.trim() || !/^\d+$/.test(phoneNumberId ?? "") || !/^v\d+\.\d+$/.test(apiVersion) || !/^[a-z0-9_]+$/.test(templateName) || !/^[a-z]{2}(?:_[A-Z]{2})?$/.test(language)) {
    throw new Error("O envio oficial de códigos pelo WhatsApp ainda não está configurado.");
  }
  if (!/^\d{10,11}$/.test(normalized) || !/^\d{6}$/.test(code)) throw new Error("Telefone ou código inválido.");
  try {
    const response = await transport(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: `55${normalized}`, type: "template", template: {
        name: templateName, language: { code: language }, components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      } }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error("Provider rejected message"); }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("messages" in result) || !Array.isArray(result.messages) || typeof result.messages[0]?.id !== "string" || !result.messages[0].id) throw new Error("Missing message acknowledgment");
    return { messageId: result.messages[0].id as string };
  } catch {
    // Do not echo Meta errors: they may include token, recipient or template details.
    // Never retry through Evolution when the official provider is selected.
    throw new Error("Não foi possível enviar o código pela API oficial do WhatsApp.");
  }
}
