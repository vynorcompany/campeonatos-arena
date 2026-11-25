import Link from "next/link";
import { AthletePortalLoginLayout } from "@/components/athlete-portal-login-layout";
import { AthleteEmailConfirmationForm } from "@/components/auth/athlete-email-access-forms";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";
export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmar e-mail · Portal do Atleta", referrer: "no-referrer" as const };
export default async function ConfirmAthleteEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const actor = await getPublicAthleteIdentity();
  return <AthletePortalLoginLayout><section className="tw:grid tw:min-w-0 tw:gap-5"><h1 className="tw:m-0 tw:text-xl tw:font-medium">Confirmar e-mail de recuperação</h1>{actor?.id && /^[a-f0-9]{64}$/i.test(token) ? <AthleteEmailConfirmationForm token={token}/> : <p role="status" className="tw:m-0 tw:text-sm">Entre na sua conta do Portal e abra novamente o link recebido por e-mail.</p>}<Link href="/portal" className="tw:text-sm tw:text-[#174983]">Voltar ao Portal</Link></section></AthletePortalLoginLayout>;
}
