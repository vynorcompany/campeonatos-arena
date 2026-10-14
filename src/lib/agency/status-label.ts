const labels: Record<string, string> = {
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada",
};

export function agencyStatusLabel(status: string) {
  return labels[status] ?? status;
}
