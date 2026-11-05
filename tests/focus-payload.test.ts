import assert from "node:assert/strict";
import test from "node:test";
import { buildFocusNfce, validFiscalCnpj, focusPayment, type FocusSale } from "../src/lib/fiscal/focus-payload";
const profile = { ncm:"22021000", cest:"0300700", origin:"0", gtin:"SEM GTIN", gtinTrib:"SEM GTIN", commercialUnit:"UN", tributaryUnit:"UN", tributaryFactor:"1", cfop:"5102", icmsCode:"102", pisCst:"99",pisRate:"0",cofinsCst:"99",cofinsRate:"0" };
const issuer = { crt:"1",issuerState:"PR",focusCnpj:"11222333000181" };
const date = new Date("2026-11-05T15:00:00Z");
const sale = (): FocusSale => ({totalCents:3000,items:[{productId:"drink",quantity:1,unitPriceCents:3000,totalCents:3000,fiscalProfile:profile,product:{name:"Bebida preparada",isService:false}}],payments:[{paymentMethod:"Dinheiro",amountCents:3000}]});
test("Focus: valida CNPJ e serializa produto vendido sem duplicar ingredientes, com campos oficiais",()=>{
 assert.equal(validFiscalCnpj(issuer.focusCnpj),true);assert.equal(validFiscalCnpj("11111111111111"),false);assert.equal(validFiscalCnpj("11222333000180"),false);
 const payload=buildFocusNfce(sale(),issuer,"SANDBOX",date);
 assert.equal(payload.items.length,1);assert.equal(payload.items[0].cest,"0300700");assert.match(payload.items[0].descricao,/SEM VALOR FISCAL/);assert.equal(payload.items[0].valor_bruto,"30.00");assert.equal(payload.items[0].pis_valor,"0.00");assert.equal(payload.formas_pagamento[0].forma_pagamento,"01");
 assert.equal(buildFocusNfce(sale(),issuer,"PRODUCTION",date).items[0].descricao,"Bebida preparada");
});
test("Focus: bloqueia serviços, campos incompletos, tributação não suportada e divergências de valores",()=>{
 const value=sale();value.items[0].product.isService=true;assert.throws(()=>buildFocusNfce(value,issuer,"SANDBOX",date),/serviço/);
 for(const change of [{ncm:""},{icmsCode:"900"},{pisRate:""},{pisRate:"1.65"},{ibsCbsCst:"000",cClassTrib:"000001"},{benefitCode:"PR800001"}]) {const value=sale();value.items[0].fiscalProfile={...profile,...change};assert.throws(()=>buildFocusNfce(value,issuer,"SANDBOX",date));}
 const unpaid=sale();unpaid.payments[0].amountCents=1000;assert.throws(()=>buildFocusNfce(unpaid,issuer,"SANDBOX",date),/quite integralmente/);
 const mismatch=sale();mismatch.items[0].totalCents=2000;assert.throws(()=>buildFocusNfce(mismatch,issuer,"SANDBOX",date),/divergente/);
 assert.throws(()=>focusPayment("Forma inventada"),/código fiscal/);assert.equal(focusPayment("Débito"),"04");
 assert.throws(()=>buildFocusNfce(sale(),issuer,"PRODUCTION",new Date("2027-01-01T15:00:00Z")),/2027/);
});
