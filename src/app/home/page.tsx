import { redirect } from "next/navigation";
import PublicStandingsPage from "@/app/classificacao/[arenaSlug]/page";

export const dynamic = "force-dynamic";

export default async function HomePage(
  props: {
    searchParams?: Promise<Record<string, string | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const arenaSlug = searchParams?.arena?.trim();
  if (!arenaSlug) redirect("/portal");
  return <PublicStandingsPage params={Promise.resolve({ arenaSlug })} searchParams={Promise.resolve(searchParams ?? {})} />;
}
