"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { getPublicLinkedPlayerIds } from "@/lib/services/public-player-link";
import { recordCategoryMatchResult } from "@/lib/services/category-competition/matches";
import { recordCategoryTrioGame } from "@/lib/services/category-trio";
import { portalResultError } from "@/lib/services/portal-match-result-access";

const score = z.string().trim().min(1, "Informe o placar das duas equipes.").transform(Number).pipe(z.number({ error: "Informe um placar válido." }).int("Informe um placar inteiro entre 0 e 99.").min(0, "Informe um placar entre 0 e 99.").max(99, "Informe um placar entre 0 e 99."));
const resultSchema = z.object({
  arenaSlug: z.string().trim().min(1), matchId: z.string().trim().min(1),
  homeScore: score, awayScore: score,
}).refine(input => input.homeScore !== input.awayScore, "Informe um placar válido, sem empate.");
const trioSchema = resultSchema.safeExtend({
  gameNumber: z.coerce.number().int("Jogo inválido do confronto.").min(1, "Jogo inválido do confronto.").max(3, "Jogo inválido do confronto."),
  homePlayerIds: z.array(z.string().min(1)).length(2, "Selecione dois atletas da equipe mandante."),
  awayPlayerIds: z.array(z.string().min(1)).length(2, "Selecione dois atletas da equipe visitante."),
});

function refreshResults(arenaSlug: string) {
  revalidatePath("/home");
  revalidatePath(`/classificacao/${arenaSlug}`);
  revalidatePath("/torneios", "layout");
}

export async function recordOwnEventMatchResultAction(data: FormData) {
  const parsed = resultSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Informe um placar válido." };
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const playerIds = await getPublicLinkedPlayerIds(auth.arenaId, auth.playerId);
  try {
    const { matchId, homeScore, awayScore } = parsed.data;
    await recordCategoryMatchResult(auth.arenaId, matchId, homeScore, awayScore, { playerId: auth.playerId, playerIds });
    refreshResults(parsed.data.arenaSlug);
    return { success: true as const, matchId, homeScore, awayScore };
  } catch (error) {
    return { success: false as const, error: portalResultError(error) };
  }
}

export async function recordOwnTrioGameResultAction(data: FormData) {
  const parsed = trioSchema.safeParse({ ...Object.fromEntries(data), homePlayerIds: data.getAll("homePlayerIds"), awayPlayerIds: data.getAll("awayPlayerIds") });
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Informe os atletas e o placar." };
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const playerIds = await getPublicLinkedPlayerIds(auth.arenaId, auth.playerId);
  try {
    const { arenaSlug, matchId, ...game } = parsed.data;
    const saved = await recordCategoryTrioGame(auth.arenaId, matchId, game, { id: auth.playerId, name: "Atleta pelo Portal" }, { playerId: auth.playerId, playerIds });
    refreshResults(arenaSlug);
    return { success: true as const, matchId, homeScore: saved.homeWins, awayScore: saved.awayWins };
  } catch (error) {
    return { success: false as const, error: portalResultError(error) };
  }
}
