import test from "node:test";
import assert from "node:assert/strict";
import { creditExpiration, expiryPolicySchema } from "../src/lib/academy/credit-expiry-policy";
test("validade de aulas usa dias ou meses de calendário sem estourar fevereiro",()=>{
 const date=new Date("2028-01-31T15:00:00Z");
 assert.equal(creditExpiration(date,{creditExpiryCycle:"NONE",creditExpiryDays:null}),null);
 for(const [cycle,expected] of [["FORTNIGHT","2028-02-15T15:00:00.000Z"],["MONTHLY","2028-02-29T15:00:00.000Z"],["QUARTERLY","2028-04-30T15:00:00.000Z"],["YEARLY","2029-01-31T15:00:00.000Z"],["CUSTOM","2028-02-02T15:00:00.000Z"]] as const)assert.equal(creditExpiration(date,{creditExpiryCycle:cycle,creditExpiryDays:2})!.toISOString(),expected);
 assert.throws(()=>expiryPolicySchema.parse({creditExpiryCycle:"CUSTOM",creditExpiryDays:0}));
 assert.throws(()=>expiryPolicySchema.parse({creditExpiryCycle:"CUSTOM"}));
});
