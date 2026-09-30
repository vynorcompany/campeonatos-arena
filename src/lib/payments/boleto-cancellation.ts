export type BoletoCancellationDisposition = "cancel" | "closed" | "preserve" | "unsupported";

export function boletoCancellationDisposition(status: string): BoletoCancellationDisposition {
  if (["pending", "in_process", "authorized"].includes(status)) return "cancel";
  if (["cancelled", "expired", "rejected"].includes(status)) return "closed";
  if (["approved", "refunded", "charged_back"].includes(status)) return "preserve";
  return "unsupported";
}
