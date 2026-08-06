export type LeagueMatchResultActionState = {
  error: string | null;
  success: boolean;
};

export function leagueMatchResultErrorState(error: unknown): LeagueMatchResultActionState {
  return {
    error: error instanceof Error ? error.message : "Não foi possível salvar o resultado.",
    success: false,
  };
}

export const initialLeagueMatchResultActionState: LeagueMatchResultActionState = {
  error: null,
  success: false,
};
