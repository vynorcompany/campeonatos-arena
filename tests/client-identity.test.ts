import assert from "node:assert/strict";
import test from "node:test";
import { createClientSchema,quickClientSchema,updateClientSchema } from "../src/lib/validators/player";
import { formatBrazilianPhone,normalizeBrazilianPhone } from "../src/lib/phone";
import { boletoPayerDocument,getMissingBoletoPayerFields } from "../src/lib/payments/boleto-payer";
const base={name:"Cliente Teste",points:1000};
test("pessoa jurídica aceita razão social, mantém CPF separado e rejeita CNPJ truncado",()=>{
 const company=createClientSchema.parse({...base,name:"Empresa",personType:"PJ",cnpj:"12345678000190",allowOverdueComandas:false});
 assert.equal(createClientSchema.parse({...base,personType:"PJ",cnpj:"00000000E08G12"}).cnpj,"00000000E08G12");
 assert.equal(company.cnpj,"12345678000190");assert.equal(company.cpf,"");assert.equal(company.allowOverdueComandas,false);
 assert.equal(createClientSchema.safeParse({...base,name:"Empresa",personType:"PF"}).success,false);
 assert.equal(createClientSchema.safeParse({...base,personType:"PJ",cnpj:"123"}).success,false);
 assert.equal(quickClientSchema.safeParse({name:"Empresa",personType:"PJ",cnpj:"12345678000190",phone:"42999990000"}).success,true);
 assert.equal(updateClientSchema.parse({...base,playerId:"client"}).allowOverdueComandas,undefined,"formulário legado não substitui a regra individual");
});
test("máscara de telefone conserva DDD e dígitos para celular, fixo e colagem com DDI",()=>{
 for(const [input,expected] of [["42999990000","(42) 99999-0000"],["4232224444","(42) 3222-4444"],["+55 (42) 99999-0000","(42) 99999-0000"],["4","(4"],["",""]]) assert.equal(formatBrazilianPhone(input),expected);
 assert.equal(normalizeBrazilianPhone(formatBrazilianPhone("42999990000")),"42999990000");
});
test("boleto de pessoa jurídica usa CNPJ sem exigir CPF",()=>{
 const payer={personType:"PJ",cnpj:"12345678000190",email:"empresa@example.test",addressZipCode:"84000000",addressStreet:"Rua QA",addressNumber:"10",addressNeighborhood:"Centro",addressCity:"Cidade",addressState:"PR"};
 assert.equal(boletoPayerDocument({...payer,cnpj:"00.000.000/E08G-12"}),"00000000E08G12");
 assert.equal(getMissingBoletoPayerFields({...payer,cnpj:"00000000E08G12"}).length,1,"CNPJ alfanumérico é preservado, com aviso específico sobre o emissor");
 assert.equal(boletoPayerDocument(payer),payer.cnpj);assert.deepEqual(getMissingBoletoPayerFields(payer),[]);
 assert.ok(getMissingBoletoPayerFields({...payer,cnpj:""}).includes("CNPJ com 14 posições"));
});
