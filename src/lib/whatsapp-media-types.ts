const inlineMimeTypes = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "audio/mpeg", "audio/mp4", "audio/ogg", "audio/webm", "audio/wav", "audio/x-wav",
  "video/mp4", "video/webm",
  "application/pdf",
]);

export function safeWhatsAppMediaType(value: string) {
  const mimeType = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return inlineMimeTypes.has(mimeType)
    ? { mimeType, disposition: "inline" as const }
    : { mimeType: "application/octet-stream", disposition: "attachment" as const };
}

export function outgoingWhatsAppMediaKind(value: string) {
  const mimeType = value.trim().toLowerCase();
  if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)) return "image" as const;
  if (mimeType === "application/pdf") return "document" as const;
  return null;
}
