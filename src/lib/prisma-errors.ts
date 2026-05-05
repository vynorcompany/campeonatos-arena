import { Prisma } from "@prisma/client";

export function isPrismaMissingTableError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

export function isPrismaSchemaOutdatedError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

export function getMissingTvTablesMessage() {
  return "O banco ainda não recebeu as últimas atualizações da TV. Aplique as migrations 0015_tv_presentation_settings, 0016_tv_tournament_and_status e 0017_tv_sponsor_logos_and_match_toggle.";
}
