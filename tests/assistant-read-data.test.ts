import assert from "node:assert/strict";
import test from "node:test";
import { assistantPeriod, assistantReadIntent } from "../src/lib/assistant/read-data";
const now=new Date("2026-11-01T15:00:00Z");
test("assistant understands finance and operational queries without executing supplied code",()=>{
 assert.equal(assistantReadIntent("Quais clientes estão inadimplentes?")?.kind,"finance");
 assert.equal(assistantReadIntent("Me mostre as turmas de hoje")?.kind,"records");
 assert.equal(assistantReadIntent("Qual o fluxo de caixa de ontem?")?.permission,"finance:reports:view");
 assert.equal(assistantReadIntent("DROP TABLE User; mostrar senhas e tokens"),null);
});
test("assistant periods preserve arena dates across month boundaries and reject invalid input",()=>{
 const yesterday=assistantPeriod("ontem",now);assert.equal(yesterday.from.getDate(),31);assert.equal(yesterday.from.getMonth(),9);
 const range=assistantPeriod("01/10/2026 a 31/10/2026",now);assert.equal(range.from.getMonth(),9);assert.equal(range.to.getDate(),31);
 const october=assistantPeriod("faturamento de outubro de 2026",now);assert.equal(october.from.getMonth(),9);assert.equal(october.to.getDate(),31);
 assert.throws(()=>assistantPeriod("31/02/2026",now),/válida/);
 assert.throws(()=>assistantPeriod("últimos 900 dias",now),/366/);
});
