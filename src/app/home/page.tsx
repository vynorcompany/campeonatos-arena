import { redirect } from "next/navigation";
import PublicStandingsPage from "@/app/classificacao/[arenaSlug]/page";

export const dynamic = "force-dynamic";

export default function HomePage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const arenaSlug = searchParams?.arena?.trim();
  if (!arenaSlug) redirect("/portal");
  return <PublicStandingsPage params={{ arenaSlug }} searchParams={searchParams} />;
}
