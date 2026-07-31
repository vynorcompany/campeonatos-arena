type StatusBadgeProps = {
  status: string;
};

const labels: Record<string, string> = {
  DRAFT: "Rascunho",
  READY_FOR_DRAW: "Pronto para sorteio",
  GROUPS_DEFINED: "Grupos definidos",
  MATCHES_DEFINED: "Jogos definidos",
  PUBLISHED: "Publicado",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizado",
  REGISTRATIONS: "Inscrições",
  EDITING: "Editando",
  LIVE: "Acontecendo"
  ,
  SCHEDULED: "Agendado"
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, "-");
  return <span className={`pill status-badge status-badge-${normalized}`}>{labels[status] ?? status}</span>;
}
