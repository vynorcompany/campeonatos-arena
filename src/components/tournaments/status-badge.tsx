import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./status-badge.utilities";
type StatusBadgeProps = {
  status: string;
  compact?: boolean;
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
  WAITING: "Aguardando",
  SCHEDULED: "Agendado"
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, "-");
  return <span className={cx(`${compact ? viewStyles.compact : viewStyles.pill} ${compact ? (viewStyles.states[status as keyof typeof viewStyles.states] ?? viewStyles.states.SCHEDULED) : ""} status-badge-${normalized}`)}>{labels[status] ?? status}</span>;
}
