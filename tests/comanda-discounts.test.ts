import assert from "node:assert/strict";
import test from "node:test";
import { calculateComandaDiscounts } from "../src/lib/comandas/discounts";
test("total discounts distribute every cent proportionally and deterministically",()=>{
 const input={mode:"TOTAL" as const,discountCents:2,itemDiscounts:[],items:[{id:"a",amountCents:1},{id:"b",amountCents:1}],debts:[{id:"c",amountCents:1}]};
 const r=calculateComandaDiscounts(input);assert.equal(r.discountCents,2);assert.deepEqual(r.items.map(i=>i.netCents),[0,0]);assert.equal(r.debts[0].netCents,1);
 const large=calculateComandaDiscounts({...input,discountCents:1_000_000_000,items:[{id:"a",amountCents:1_000_000_001}],debts:[]});assert.equal(large.items[0].netCents,1);
});
test("discount modes reject duplicate lines, invalid cents, over-discounting and hidden combination",()=>{
 const base={mode:"ITEMS" as const,discountCents:0,itemDiscounts:[],items:[{id:"a",amountCents:100}],debts:[]};
 for(const amountCents of [-1,101,NaN,1.5])assert.throws(()=>calculateComandaDiscounts({...base,itemDiscounts:[{kind:"ITEM",id:"a",amountCents}]}));
 assert.throws(()=>calculateComandaDiscounts({...base,itemDiscounts:[{kind:"ITEM",id:"a",amountCents:1},{kind:"ITEM",id:"a",amountCents:1}]}));
 assert.throws(()=>calculateComandaDiscounts({...base,mode:"TOTAL",discountCents:1,itemDiscounts:[{kind:"ITEM",id:"a",amountCents:1}]}));
 assert.throws(()=>calculateComandaDiscounts({...base,discountCents:1}));
});
