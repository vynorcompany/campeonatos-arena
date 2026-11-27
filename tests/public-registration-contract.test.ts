import assert from 'node:assert/strict';
import test from 'node:test';
import {publicRegistrationInputSchema,publicRegistrationStateSchema,publicRegistrationOutcomeSchema} from '../src/lib/backend/contracts/public-registration';
import {PublicRegistrationOperationError,publicRegistrationError} from '../src/lib/backend/services/public-registration-errors';
test('public registration contract accepts form fields but rejects pricing, account and identity authority',()=>{
 const fields={tournamentSlug:['event'],categoryId:['category'],leadName:['Atleta API'],leadPhone:['41999990000'],registrationType:['INDIVIDUAL'],contactWebsite:['']};assert.ok(publicRegistrationInputSchema.safeParse({fields}).success);
 for(const key of ['arenaId','playerId','paymentStatus','amountCents','bankAccountId','registrationId'])assert.equal(publicRegistrationInputSchema.safeParse({fields:{...fields,[key]:['forged']}}).success,false);
 assert.equal(publicRegistrationInputSchema.safeParse({fields:{...fields,categoryId:['one','two']}}).success,false);
 assert.equal(publicRegistrationInputSchema.safeParse({fields:{...fields},file:{base64:'AAAA'}}).success,false);
});
test('registration state exposes only payment presentation and guards checkout links and errors',()=>{
 const state={error:null,success:'Inscrição criada',amountCents:7500,registrationId:'r',paymentCheckoutUrl:'https://checkout.example.test'};assert.ok(publicRegistrationOutcomeSchema.safeParse({state,committed:true}).success);
 for(const value of ['javascript:alert(1)','data:text/html,test','https://user:secret@example.test'])assert.equal(publicRegistrationStateSchema.safeParse({...state,paymentCheckoutUrl:value}).success,false);
 assert.equal(publicRegistrationStateSchema.safeParse({...state,encryptedSecrets:'private'}).success,false);
 assert.equal(publicRegistrationError(new PublicRegistrationOperationError('Categoria invalida.')),'Categoria invalida.');assert.doesNotMatch(publicRegistrationError(new Error('SQL private database token')),/SQL|private|token/);
});
