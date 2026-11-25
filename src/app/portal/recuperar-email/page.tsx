import Link from "next/link";
import { AthletePortalLoginLayout } from "@/components/athlete-portal-login-layout";
import { AthleteEmailPasswordRequestForm } from "@/components/auth/athlete-email-access-forms";
import { accountEmailIsConfigured } from "@/lib/auth/account-email";
export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar senha · Portal do Atleta", referrer: "no-referrer" as const };
export default function AthleteEmailRecoveryPage() {
  return <AthletePortalLoginLayout><section className="tw:grid tw:min-w-0 tw:gap-5"><h1 className="tw:m-0 tw:text-xl tw:font-medium">Recuperar senha por e-mail</h1>{accountEmailIsConfigured() ? <AthleteEmailPasswordRequestForm/> : <p role="status" className="tw:m-0 tw:text-sm">A recuperação por e-mail ainda não está disponível.</p>}<Link href="/portal" className="tw:text-sm tw:text-[#174983]">Voltar ao Portal</Link></section></AthletePortalLoginLayout>;
}
