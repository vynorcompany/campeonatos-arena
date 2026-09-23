import { revalidatePath } from "next/cache";

const tournamentRoutes = [
  "/painel",
  "/torneios",
  "/torneios/rankings",
  "/jogadores",
  "/duplas",
  "/grupos",
  "/jogos",
  "/overview",
  "/tournaments",
  "/players",
  "/pairs",
  "/groups",
  "/matches",
  "/torneios/inscricoes",
] as const;

export function refreshTournamentRoutes() {
  for (const route of tournamentRoutes) revalidatePath(route);
}
