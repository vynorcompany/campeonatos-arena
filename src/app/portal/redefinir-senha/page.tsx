import Link from "next/link";
import { AthletePortalLoginLayout } from "@/components/athlete-portal-login-layout";
import { AthleteEmailPasswordResetForm } from "@/components/auth/athlete-email-access-forms";
export const dynamic = "force-dynamic";
export const metadata = { title: "Nova senha · Portal do Atleta", referrer: "no-referrer" as const };
export default async function ResetAthleteEmailPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AthletePortalLoginLayout><section className="tw:grid tw:min-w-0 tw:gap-5"><h1 className="tw:m-0 tw:text-xl tw:font-medium">Nova senha</h1>{/^[a-f0-9]{64}$/i.test(token) ? <AthleteEmailPasswordResetForm token={token}/> : <p role="alert" className="tw:m-0 tw:text-sm">Link inválido. Solicite uma nova recuperação.</p>}<Link href="/portal" className="tw:text-sm tw:text-[#174983]">Voltar ao Portal</Link></section></AthletePortalLoginLayout>;
}
