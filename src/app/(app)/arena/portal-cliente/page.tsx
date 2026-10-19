import { requirePermission } from "@/lib/auth/guards";
import { redirect } from "next/navigation";

export default async function ClientPortalSettingsPage() {
  await requirePermission("arena:portal", "view");
  redirect("/arena?section=portal");
}
