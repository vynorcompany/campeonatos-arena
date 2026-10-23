import { redirect } from "next/navigation";

/** Legacy links use the same competition directory as the sidebar. */
export default async function GamesPage({ searchParams }: { searchParams?: Promise<{ tournamentId?: string; status?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params?.tournamentId) query.set("tournamentId", params.tournamentId);
  if (params?.status === "finished") query.set("status", "finished");
  redirect(`/torneios${query.size ? `?${query}` : ""}`);
}
