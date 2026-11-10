import test from "node:test";
import assert from "node:assert/strict";
import { entryAdjustedAmount, entryAdjustmentNotes } from "../src/lib/finance/entry-adjustments";

test("lançamentos somam juros após descontos em reais ou percentual, preservando centavos",()=>{
 for (const [discount,mode] of [["10,00","AMOUNT"],["10","PERCENTAGE"]] as const) {
  const result=entryAdjustedAmount("R$ 100,00",discount,mode,"R$ 5,25");
  assert.equal(result.amountCents,9525);
  assert.equal(result.interestCents,525);
  assert.match(entryAdjustmentNotes("Anotação original",result),/Anotação original\nComposição na criação:/);
 }
 assert.equal(entryAdjustedAmount("1.234,56","0","AMOUNT","0,01").amountCents,123457);
 assert.equal(entryAdjustmentNotes("Original",entryAdjustedAmount("100","0","AMOUNT","0")),"Original");
});
test("juros e descontos inválidos não geram um lançamento silenciosamente alterado",()=>{
 for(const [amount,discount,mode,interest] of [["100","0","AMOUNT","-1"],["100","101","PERCENTAGE","0"],["100","100,01","AMOUNT","0"],["100","0","AMOUNT","999999999"],["100","0","AMOUNT","1,2,3"]] as const)assert.throws(()=>entryAdjustedAmount(amount,discount,mode,interest));
});
