import { SubmitButton } from "@/components/forms/submit-button";
import { reviewLeagueMedicalSubstitutionAction } from "@/lib/actions/league-medical-substitutions";

export function LeagueMedicalRequestsPanel({ requests }: { requests: Array<{ id: string; reason: string; requestedAt: Date; pairName: string; previousPlayerName: string; replacementPlayerName: string }> }) {
  if (!requests.length) return null;
  return <section className="section-card stack-sm"><div><p className="eyebrow">LIGA</p><h2>Solicitações médicas</h2></div>{requests.map((request) => <article className="league-medical-admin-row" key={request.id}><div><strong>{request.pairName}</strong><span>{request.previousPlayerName} → {request.replacementPlayerName}</span><p>{request.reason}</p></div><form action={reviewLeagueMedicalSubstitutionAction}><input type="hidden" name="requestId" value={request.id} /><input name="reviewNotes" placeholder="Observação da arena" /><div className="field-inline"><SubmitButton className="button button-primary" label="Aprovar" pendingLabel="..." /><button className="button button-danger" type="submit" name="decision" value="REJECTED">Recusar</button></div><input type="hidden" name="decision" value="APPROVED" /></form></article>)}</section>;
}
