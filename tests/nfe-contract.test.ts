import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/nfe-import';
import { backendOrigin } from '../src/lib/backend/http-client';
import { ProductOperationError } from '../src/lib/backend/product-operation-error';
import { NfeXmlValidationError } from '../src/lib/fiscal/nfe-error';
import { parseNfeXml } from '../src/lib/fiscal/nfe-xml';
const xml = (quantity='2', cost='2.50') => `<NFe><infNFe Id="NFe${'1'.repeat(44)}"><ide><nNF>1</nNF></ide><emit><xNome>Fornecedor sintético</xNome></emit><det nItem="1"><prod><cProd>QA</cProd><xProd>Água sintética</xProd><qCom>${quantity}</qCom><vUnCom>${cost}</vUnCom><vProd>5.00</vProd></prod></det><total><ICMSTot><vNF>5.00</vNF></ICMSTot></total></infNFe></NFe>`;
test('NFE parser rejects entities, fractional inventory and values outside database range', () => {
  const invoice = parseNfeXml(xml()); assert.equal(invoice.items[0].quantity,2); assert.equal(invoice.items[0].unitCostCents,250);
  for (const value of ['<!DOCTYPE x>'+xml(),'<!ENTITY secret SYSTEM "file:///etc/passwd">'+xml(),xml('1.5'),xml('2147483648'),xml('2','21474836.48'),xml().replace('1'.repeat(44),'short')]) assert.throws(()=>parseNfeXml(value),NfeXmlValidationError);
});
test('NFE contracts refuse authority, malformed reconciliation and private preview fields', () => {
  const file = {name:'entrada.xml',type:'text/xml',data:Buffer.from(xml()).toString('base64')};
  assert.equal(contracts.nfePreviewInputSchema.safeParse({file}).success,true);
  assert.equal(contracts.nfePreviewInputSchema.safeParse({file,arenaId:'foreign'}).success,false);
  const item = {index:0,productId:'p',name:'Água',sku:'QA',costCents:250,priceCents:500};
  assert.equal(contracts.nfeImportInputSchema.safeParse({file,items:[item]}).success,true);
  for (const items of [[item,item],[{...item,costCents:-1}],[{...item,priceCents:2147483648}],[{...item,arenaId:'foreign'}],{}]) assert.equal(contracts.nfeImportInputSchema.safeParse({file,items}).success,false);
  const preview = {invoice:{number:'1',supplierName:'Fornecedor',totalCents:500,items:[{code:'QA',description:'Água',quantity:2,unitCostCents:250}]},products:[]};
  assert.deepEqual(contracts.nfePreviewDataSchema.parse(preview),preview);
  assert.equal(contracts.nfePreviewDataSchema.safeParse({...preview,invoice:{...preview.invoice,supplierDocument:'private',digest:'private'}}).success,false);
});
test('NFE facade refreshes import success only and returns safe error outcomes', async () => {
  const paths:string[]=[];let fail=false;let result:object={invoice:{},products:[]};const exported:Record<string,Function>={};
  const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(p:string)=>paths.push(p)},'@/lib/backend/nfe-import-client':{remoteNfeOperation:async()=>{if(fail)throw Error('private infrastructure');return result;}},'@/lib/backend/product-operation-error':{ProductOperationError},'@/lib/fiscal/nfe-error':{NfeXmlValidationError}};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/products/nfe-mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
  await exported.runNfeOperation('preview',new FormData());assert.deepEqual(paths,[]);
  result={createdProducts:1,updatedProducts:1,importedItems:2};await exported.runNfeOperation('import',new FormData());assert.deepEqual(paths,['/financeiro/configuracoes/notas-fiscais','/financeiro/notas-fiscais','/pdv','/pdv/estoque']);paths.length=0;
  result={error:'Já importada.'};assert.deepEqual(await exported.runNfeOperation('import',new FormData()),result);assert.deepEqual(paths,[]);
  fail=true;assert.equal((await exported.runNfeOperation('import',new FormData())).error.includes('private'),false);assert.deepEqual(paths,[]);
});
test('NFE transport preserves file bytes, strips authority and never retries an import', async () => {
  const calls:{url:URL;init:RequestInit}[]=[];let fail=false;const exported:Record<string,Function>={};
  const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/contracts/nfe-import':contracts};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/nfe-import-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,File,Buffer,URL,AbortSignal,JSON,Object,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({createdProducts:1,updatedProducts:0,importedItems:1});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
  const form=new FormData();form.set('xml',new File([xml()],'entrada.xml',{type:'text/xml'}));form.set('arenaId','forged');
  await exported.remoteNfeOperation('https://backend.example.test','import',form);const payload=JSON.parse(calls[0].init.body as string);assert.equal(Buffer.from(payload.file.data,'base64').toString('utf8'),xml());assert.equal(payload.arenaId,undefined);assert.deepEqual(payload.items,[]);assert.equal(new Headers(calls[0].init.headers).get('cookie'),'padel_session=fixture');assert.equal(new Headers(calls[0].init.headers).get('authorization'),null);assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.cache,'no-store');
  form.append('xml',new File([xml()],'other.xml'));assert.ok((await exported.remoteNfeOperation('https://backend.example.test','import',form)).error);assert.equal(calls.length,1);
  form.delete('xml');form.set('xml',new File([new Uint8Array(contracts.nfeMaxFileBytes+1)],'large.xml'));assert.ok((await exported.remoteNfeOperation('https://backend.example.test','import',form)).error);assert.equal(calls.length,1);
  form.set('xml',new File([xml()],'entrada.xml'));fail=true;await assert.rejects(exported.remoteNfeOperation('https://backend.example.test','import',form));assert.equal(calls.length,2);
});
