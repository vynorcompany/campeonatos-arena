import test from "node:test";
import assert from "node:assert/strict";
import {portalArenaSlugForHost} from "../src/lib/portal/login-arena-host";
const mapping=JSON.stringify({"arenapadelsamas.com.br":"arena-padel-samas","www.arenapadelsamas.com.br":"arena-padel-samas","outra.example":"outra-arena"});
test("login usa somente a marca configurada para o domínio exato, com ou sem www",()=>{
 for(const host of ["arenapadelsamas.com.br","www.arenapadelsamas.com.br","WWW.ARENAPADELSAMAS.COM.BR:443","arenapadelsamas.com.br."])assert.equal(portalArenaSlugForHost(host,mapping),"arena-padel-samas");
 assert.equal(portalArenaSlugForHost("outra.example",mapping),"outra-arena");
 for(const host of ["desconhecido.example","arenapadelsamas.com.br.evil.example","evil.example@arenapadelsamas.com.br","arenapadelsamas.com.br, evil.example","https://arenapadelsamas.com.br","arenapadelsamas.com.br/path",null])assert.equal(portalArenaSlugForHost(host,mapping),null);
});
test("configuração ausente ou inválida preserva o Portal genérico",()=>{
 for(const config of [undefined,"", "[1]","null", "{",JSON.stringify({"arenapadelsamas.com.br":"../arena"}),"x".repeat(32769)])assert.equal(portalArenaSlugForHost("arenapadelsamas.com.br",config),null);
});
