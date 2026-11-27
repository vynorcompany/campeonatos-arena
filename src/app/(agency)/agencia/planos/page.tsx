import { AgencyPlansContent } from "@/components/agency/agency-plans-content";
import { requireAgencyPageAccess } from "@/lib/auth/guards";
import { getAgencyPlansPage } from "@/lib/agency/pages";

export default async function AgencyPlansPage({ searchParams }: { searchParams: Promise<{ connected?: string; connectionError?: string }> }) {
  await requireAgencyPageAccess();
  const notice = await searchParams;
  const data = await getAgencyPlansPage();
  return <AgencyPlansContent {...data} notice={notice} />;
}
