import 'server-only';
import * as loyalty from '@/lib/backend/services/client-loyalty';
import * as players from '@/lib/backend/services/players';
import * as management from '@/lib/backend/services/client-management';
import { clientMutationOutcomeSchema, type ClientMutationOperation } from '@/lib/backend/contracts/client-mutations';
export async function executeClientMutation(operation: ClientMutationOperation, form: FormData) {
  switch (operation) {
    case 'loyalty-settings': await loyalty.updateClientLoyaltySettingsAction(form); break;
    case 'loyalty-visit': await loyalty.recordClientVisitAction(form); break;
    case 'loyalty-redeem': await loyalty.redeemClientLoyaltyAction(form); break;
    case 'loyalty-fulfill': await loyalty.fulfillClientLoyaltyRewardAction(form); break;
    case 'create': return clientMutationOutcomeSchema.parse(await players.createPlayerAction({ error: null, success: null }, form));
    case 'update': return clientMutationOutcomeSchema.parse(await players.updatePlayerAction(form));
    case 'merge': {
      const result = await management.mergeClientsAction(form);
      return clientMutationOutcomeSchema.parse('error' in result ? { error: result.error } : { error: null });
    }
    case 'import': return clientMutationOutcomeSchema.parse({ error: null, ...await management.importClientsAction(form) });
    case 'archive': await players.archivePlayerAction(form); break;
    case 'reactivate': await players.reactivatePlayerAction(form); break;
    case 'delete': await players.deleteAthleteAction(form); break;
    case 'points': await players.updatePlayerPointsAction(form); break;
    case 'reset-ranking': await players.resetPlayerRankingAction(); break;
    case 'balance': await management.adjustClientBalanceAction(form); break;
    case 'archive-many': await management.archiveClientsAction(form); break;
  }
  return clientMutationOutcomeSchema.parse({ error: null });
}
