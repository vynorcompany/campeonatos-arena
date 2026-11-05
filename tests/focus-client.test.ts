import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
function client(fetcher:typeof fetch) {
 const exports:Record<string,any>={};
 vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/fiscal/focus-client.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Buffer,URL,Error,AbortSignal,fetch:fetcher,require:()=>({})});return exports;
}
test("Focus HTTP: fixed official origins, separate environments, Basic token, no redirects or leaked body",async()=>{
 const calls:{url:string;options:any}[]=[];
 const api=client((async(url:any,options:any)=>{calls.push({url,options});return new Response(JSON.stringify({status:"autorizado"}),{status:201});}) as typeof fetch);
 await api.focusRequest("SANDBOX","synthetic-token","/v2/nfce?ref=test","POST",{items:[]});
 assert.equal(calls[0].url,"https://homologacao.focusnfe.com.br/v2/nfce?ref=test");assert.equal(calls[0].options.headers.authorization,`Basic ${Buffer.from("synthetic-token:").toString("base64")}`);assert.equal(calls[0].options.redirect,"error");assert.equal(calls[0].options.cache,"no-store");
 await api.focusRequest("PRODUCTION","production-only","/v2/nfce/test");assert.match(calls[1].url,/^https:\/\/api.focusnfe.com.br\//);
 await assert.rejects(api.focusRequest("SANDBOX","token","https://untrusted.test"));assert.equal(calls.length,2);
 assert.equal(api.focusDocumentUrl("SANDBOX","/nfce/test.xml"),"https://homologacao.focusnfe.com.br/nfce/test.xml");assert.equal(api.focusDocumentUrl("SANDBOX","https://untrusted.test/test.xml"),"");
 const failed=client((async()=>new Response(JSON.stringify({codigo:"nao_encontrado",mensagem:"synthetic-secret-body"}),{status:404})) as typeof fetch);
 await assert.rejects(failed.focusRequest("SANDBOX","token","/v2/nfce/test"),(error:any)=>error.status===404&&error.providerCode==="nao_encontrado"&&!error.message.includes("synthetic-secret-body"));
});
