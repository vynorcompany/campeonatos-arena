export type LeagueMatchResultActionState = {
  error: string | null;
  success: boolean;
};

export function leagueMatchResultErrorState(error: unknown): LeagueMatchResultActionState {
  const expectedErrors = new Set([
    "Jogo de Liga inválido.",
    "Uma dupla deve vencer dois sets.",
  ]);

  if (error instanceof Error && expectedErrors.has(error.message)) {
    return { error: error.message, success: false };
  }

  throw error;
}

export const initialLeagueMatchResultActionState: LeagueMatchResultActionState = {
  error: null,
  success: false,
};
