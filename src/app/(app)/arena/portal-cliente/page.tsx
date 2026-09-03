import { requireModuleView } from "@/lib/auth/guards";
import { redirect } from "next/navigation";

export default async function ClientPortalSettingsPage() {
  await requireModuleView("arena");
  redirect("/arena?section=portal");
}
