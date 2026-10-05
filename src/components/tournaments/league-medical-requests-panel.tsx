import { viewStyles } from "./league-medical-requests-panel.utilities";
import { SubmitButton } from "@/components/forms/submit-button";
import { reviewLeagueMedicalSubstitutionAction } from "@/lib/actions/league-medical-substitutions";

export function LeagueMedicalRequestsPanel({ requests }: { requests: Array<{ id: string; reason: string; requestedAt: Date; pairName: string; previousPlayerName: string; replacementPlayerName: string }> }) {
  if (!requests.length) return null;
  return <section className={viewStyles.section_card}><div><p className={viewStyles.eyebrow}>LIGA</p><h2>Solicitações médicas</h2></div>{requests.map((request) => <article className={viewStyles.league_medical_admin_row} key={request.id}><div><strong>{request.pairName}</strong><span>{request.previousPlayerName} → {request.replacementPlayerName}</span><p>{request.reason}</p></div><form action={reviewLeagueMedicalSubstitutionAction}><input type="hidden" name="requestId" value={request.id} /><input name="reviewNotes" placeholder="Observação da arena" /><div className="field-inline"><SubmitButton className={viewStyles.button_button_primary} label="Aprovar" pendingLabel="..." /><button className={viewStyles.button_button_danger} type="submit" name="decision" value="REJECTED">Recusar</button></div><input type="hidden" name="decision" value="APPROVED" /></form></article>)}</section>;
}
