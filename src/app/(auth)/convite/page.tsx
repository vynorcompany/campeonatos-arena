import Link from "next/link";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { AcceptInviteForm } from "@/components/auth/account-access-forms";
import { hashAccountToken } from "@/lib/auth/account-tokens";
import { prisma } from "@/lib/prisma";

export default async function ArenaInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const invite = /^[a-f0-9]{64}$/i.test(token) ? await prisma.accountActionToken.findUnique({ where: { tokenHash: hashAccountToken(token) }, select: { kind: true, email: true, arenaId: true, usedAt: true, expiresAt: true } }) : null;
  const valid = invite?.kind === "INVITE" && invite.arenaId && !invite.usedAt && invite.expiresAt > new Date();
  const [arena, existingUser] = valid ? await Promise.all([prisma.arena.findUnique({ where: { id: invite.arenaId! }, select: { name: true } }), prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } })]) : [null, null];
  return <div className="auth-page login-page"><div className="login-shell"><LoginBrandPanel /><main className="login-form-panel"><div className="login-form-content"><span className="login-form-eyebrow">CONVITE DE ACESSO</span><h1>{arena ? `Acesse ${arena.name}` : "Convite indisponível"}</h1>{valid && arena ? <><p className="login-form-intro">Este convite vincula {invite.email} à arena.</p><AcceptInviteForm token={token} existingUser={Boolean(existingUser)} /></> : <p className="form-error">O convite expirou ou já foi utilizado. Peça um novo link ao administrador da arena.</p>}<p className="auth-switch"><Link href="/login">Voltar ao login</Link></p></div></main></div></div>;
}
