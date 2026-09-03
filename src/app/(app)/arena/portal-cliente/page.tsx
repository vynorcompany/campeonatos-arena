import Link from "next/link";
import { PortalEditorPanels } from "@/components/portal-editor-panels";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function ClientPortalSettingsPage() {
  const auth = await requireModuleView("arena");
  const [announcements, posts] = await Promise.all([
    prisma.portalAnnouncement.findMany({ where: { arenaId: auth.arenaId }, orderBy: { createdAt: "desc" } }),
    prisma.portalEventPost.findMany({ where: { arenaId: auth.arenaId }, orderBy: { createdAt: "desc" } }),
  ]);
  return <div className="stack-md client-portal-settings"><header className="page-header"><div><p className="eyebrow">PORTAL DO CLIENTE</p><h1>Início do portal</h1><p>Publique avisos e eventos para o cliente.</p></div><Link className="button" href="/arena">Voltar</Link></header><PortalEditorPanels announcements={announcements} posts={posts} /></div>;
}
