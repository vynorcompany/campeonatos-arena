/** Keeps group authors separate from message text, including pre-migration history. */
export function presentWhatsAppGroupMessage(input: { isGroup: boolean; direction: string; body: string; senderName?: string }) {
  if (!input.isGroup || input.direction !== "INBOUND") return { senderName: "", body: input.body };
  if (input.senderName?.trim()) return { senderName: input.senderName.trim(), body: input.body };
  // Older webhook events stored "Author: message" in body instead of senderName.
  const legacy = /^([^:\n]{1,80}):\s+([\s\S]+)$/.exec(input.body);
  return legacy ? { senderName: legacy[1].trim(), body: legacy[2] } : { senderName: "", body: input.body };
}
