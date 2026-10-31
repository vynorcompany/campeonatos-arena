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

const documentMimeTypes = new Set(["application/pdf", "text/plain", "text/csv", "application/rtf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet"]);
const extensionMimeTypes: Record<string, string> = { pdf: "application/pdf", txt: "text/plain", csv: "text/csv", rtf: "application/rtf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", odt: "application/vnd.oasis.opendocument.text", ods: "application/vnd.oasis.opendocument.spreadsheet" };
export function attachmentMimeType(file: { type: string; name: string }) {
  return file.type && file.type !== "application/octet-stream" ? file.type : extensionMimeTypes[file.name.split(".").at(-1)?.toLowerCase() ?? ""] || file.type;
}
export function attachmentFileName(name: string) { return name.replace(/\\/g, "/").split("/").at(-1)?.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 240) || "Documento"; }

export function outgoingWhatsAppMediaKind(value: string) {
  const mimeType = value.trim().toLowerCase();
  if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)) return "image" as const;
  if (documentMimeTypes.has(mimeType)) return "document" as const;
  return null;
}
