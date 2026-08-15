import { redirect } from "next/navigation";

export default function CourtConfigurationPage({ params }: { params: { courtId: string } }) {
  redirect(`/agenda/configuracao?court=${encodeURIComponent(params.courtId)}`);
}
