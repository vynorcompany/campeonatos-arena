import assert from"node:assert/strict";
import test from"node:test";
import{readFileSync}from"node:fs";
import{financialMutationInputSchema}from"../src/lib/backend/contracts/financial-mutations";
import{financialOperationsOptionsSchema,portalPaymentOptionsSchema,comandaWhatsappOptionsSchema}from"../src/lib/backend/contracts/financial-options";
import{lookupInputSchema,clientRegistrationDefaultsSchema}from"../src/lib/backend/contracts/lookups";
test("financial options and lookup contracts reject caller authority, duplicate scalars and misplaced fields",()=>{
 assert.equal(financialMutationInputSchema("settings-save-financial-operations").safeParse({fields:{arenaId:["foreign"]}}).success,false);
 assert.equal(financialMutationInputSchema("settings-save-comanda-whatsapp").safeParse({fields:{whatsappPaidEnabled:["on","off"]}}).success,false);
 assert.equal(financialMutationInputSchema("settings-send-pending-comanda-whatsapp").safeParse({fields:{deliveryId:["foreign"]}}).success,false);
 assert.ok(lookupInputSchema.safeParse({fields:{kind:"client",name:"Paulo Kaufman",phone:"00000000000"}}).success);
 for(const fields of[{kind:"unknown"},{kind:"supplier",arenaId:"foreign"},{kind:"client",actorId:"foreign"}])assert.equal(lookupInputSchema.safeParse({fields}).success,false);
 assert.ok(clientRegistrationDefaultsSchema.safeParse({allowOverdueComandas:true}).success);
});
test("financial options DTOs reject provider credentials and unrelated private settings",()=>{
 assert.ok(financialOperationsOptionsSchema.safeParse({settings:null}).success);
 assert.equal(financialOperationsOptionsSchema.safeParse({settings:null,encryptedToken:"private"}).success,false);
 assert.ok(portalPaymentOptionsSchema.safeParse({settings:null,connection:{status:"CONNECTED"},accounts:[]}).success);
 assert.equal(portalPaymentOptionsSchema.safeParse({settings:null,connection:{status:"CONNECTED",encryptedSecrets:"private"},accounts:[]}).success,false);
 assert.equal(comandaWhatsappOptionsSchema.safeParse({settings:null,deliveries:[],pending:0,players:[{id:"own",name:"Paulo",email:"private@example.test"}]}).success,false);
});
test("financial settings renderers and public action facades contain no direct database or provider dispatch",()=>{
 for(const file of["src/components/comandas/financial-operations-settings.tsx","src/components/comandas/portal-payment-settings.tsx","src/components/comandas/whatsapp-settings.tsx","src/lib/actions/smart-lookup.ts","src/lib/actions/client-registration-defaults.ts","src/lib/actions/financial-operations-settings.ts","src/lib/actions/portal-payment-settings.ts","src/lib/actions/comanda-whatsapp-settings.ts"]){assert.doesNotMatch(readFileSync(file,"utf8"),/arenaDatabase|withArenaTransaction|dispatchComandaWhatsapp|prisma\./);}
});
