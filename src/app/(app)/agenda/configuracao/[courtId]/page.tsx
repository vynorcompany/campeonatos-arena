import { redirect } from "next/navigation";

export default async function CourtConfigurationPage(props: { params: Promise<{ courtId: string }> }) {
  const params = await props.params;
  redirect(`/agenda/configuracao?court=${encodeURIComponent(params.courtId)}`);
}
