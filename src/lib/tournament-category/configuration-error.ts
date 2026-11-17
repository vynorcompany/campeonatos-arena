export class CategoryCompetitionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryCompetitionConfigurationError";
  }
}
