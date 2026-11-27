import assert from 'node:assert/strict';
import test from 'node:test';
import {leagueActionFields,leagueActionInputSchema,leagueActionOutcomeSchema} from '../src/lib/backend/contracts/league-actions';
import {LeagueOperationError,leagueOperationMessage,isLeagueOperationError} from '../src/lib/backend/services/league-operation-errors';
test('league operations reject identity overrides, duplicates and cross-operation fields',()=>{
 for(const operation of Object.keys(leagueActionFields) as (keyof typeof leagueActionFields)[]){const schema=leagueActionInputSchema(operation),fields=operation==='review'?{requestId:['request']}:{arenaSlug:['arena']};assert.ok(schema.safeParse({fields}).success);for(const key of ['playerId','arenaId','reviewedBy','actorId'])assert.equal(schema.safeParse({fields:{...fields,[key]:['forged']}}).success,false);assert.equal(schema.safeParse({fields:{...fields,[Object.keys(fields)[0]]:['one','two']}}).success,false);}
 assert.equal(leagueActionInputSchema('medical').safeParse({fields:{arenaSlug:['arena'],decision:['APPROVED']}}).success,false);
 assert.ok(leagueActionOutcomeSchema.safeParse({error:null,result:{success:true,matchId:'m',homeScore:2,awayScore:0}}).success);
 assert.equal(leagueActionOutcomeSchema.safeParse({error:null,internalSQL:'private'}).success,false);
});
test('league operation failures preserve actionable business feedback without exposing infrastructure',()=>{
 assert.equal(leagueOperationMessage(new LeagueOperationError('Somente a dupla convidada pode responder.')),'Somente a dupla convidada pode responder.');
 assert.ok(isLeagueOperationError(new Error('As três sugestões deste confronto já foram utilizadas.')));
 for(const error of [new Error('SELECT passwordHash FROM Player'),new Error('connection refused database.internal'),{message:'private'}])assert.equal(leagueOperationMessage(error),'Não foi possível confirmar a operação. Confira os dados antes de tentar novamente.');
});
