import assert from "node:assert/strict";
import test from "node:test";
import { allocateComandaLines, allocateComandaShares, equalComandaShares, includeUnselectedComandaItems } from "../src/lib/comandas/split";

test("divisão conserva centavos inclusive em três partes", () => {
  assert.deepEqual(equalComandaShares(1000, 3), [334, 333, 333]);
  const parts = allocateComandaShares([{ playerId: "owner", amountCents: 334 }, { playerId: "a", amountCents: 333 }, { playerId: "b", amountCents: 333 }], 1000, 500, 100);
  assert.deepEqual(parts.map(part => part.outstandingCents), [0, 67, 333]);
  assert.equal(parts.reduce((sum, part) => sum + part.outstandingCents + part.paidCents + part.creditCents, 0), 1000);
});
test("crédito do titular não quita a parte de outra pessoa", () => {
  assert.throws(() => allocateComandaShares([{ playerId: "owner", amountCents: 500 }, { playerId: "a", amountCents: 500 }], 1000, 0, 600), /excedem/);
});
test("rejeita divisão duplicada, valores divergentes e pagamentos em excesso", () => {
  assert.throws(() => allocateComandaShares([{ playerId: "a", amountCents: 500 }, { playerId: "a", amountCents: 500 }], 1000, 0, 0), /única vez/);
  assert.throws(() => allocateComandaShares([{ playerId: "a", amountCents: 999 }], 1000, 0, 0), /soma/);
  assert.throws(() => allocateComandaShares([{ playerId: null, amountCents: 1000 }], 1000, 1001, 0), /excedem/);
});
test("selected items are divided exactly and all unselected consumption remains with the holder", () => {
  const parts=includeUnselectedComandaItems([{playerId:"owner",amountCents:334},{playerId:"other",amountCents:333}],667,2500);
  assert.deepEqual(parts,[{playerId:"owner",amountCents:2167},{playerId:"other",amountCents:333}]);
  assert.equal(parts.reduce((sum,part)=>sum+part.amountCents,0),2500);
  assert.deepEqual(allocateComandaShares(parts,2500,1500,0).map(part=>part.outstandingCents),[667,333]);
  assert.throws(()=>includeUnselectedComandaItems(parts,667,2500),/soma/);
  assert.throws(()=>includeUnselectedComandaItems([],100,50),/Seleção/);
});

test("line allocation conserves each client and charge across uneven cents and zero lines",()=>{
 for(let total=0;total<200;total++){
  const shares=equalComandaShares(total,3).map((amountCents,index)=>({playerId:String(index),amountCents}));
  const lines=[{id:"products",amountCents:Math.floor(total/3)},{id:"booking",amountCents:total-Math.floor(total/3)},{id:"zero",amountCents:0}];
  const matrix=allocateComandaLines(shares,lines);
  matrix.forEach((row,index)=>assert.equal(row.parts.reduce((n,p)=>n+p.amountCents,0),lines[index].amountCents));
  shares.forEach((share,index)=>assert.equal(matrix.reduce((n,row)=>n+row.parts[index].amountCents,0),share.amountCents));
 }
 assert.throws(()=>allocateComandaLines([{playerId:"a",amountCents:1}],[{id:"same",amountCents:1},{id:"same",amountCents:0}]),/inválidos/);
});
