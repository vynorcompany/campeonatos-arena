type AthleteOption = { id: string; name: string };

function normalizeAthleteSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function searchAthleteOptions<Athlete extends AthleteOption>(athletes: Athlete[], query: string, excludedId?: string) {
  const term = normalizeAthleteSearch(query.trim());
  return athletes.filter((athlete) =>
    athlete.id !== excludedId && (!term || normalizeAthleteSearch(athlete.name).includes(term)),
  );
}
