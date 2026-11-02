import assert from "node:assert/strict";
import test from "node:test";
import { releaseRevision } from "../src/lib/release-version";
import { GET } from "../src/app/api/version/route";

test("release identifiers are normalized and reject arbitrary environment contents",()=>{
 assert.equal(releaseRevision("ABCDEF123456"),"abcdef123456");
 assert.equal(releaseRevision("ABCDEF123456"+"0".repeat(28)),"abcdef123456");
 for(const value of [undefined,null,"", "invalid", "https://example.invalid/secret", "a".repeat(39),123456789012]) assert.equal(releaseRevision(value),null);
});
test("version checks expose only the release and cannot be cached",async()=>{
 const previous=process.env.RAILWAY_GIT_COMMIT_SHA;
 try{
  process.env.RAILWAY_GIT_COMMIT_SHA="123456789abc"+"0".repeat(28);
  let response=GET();assert.deepEqual(await response.json(),{revision:"123456789abc"});assert.match(response.headers.get("Cache-Control")||"",/no-store/);
  process.env.RAILWAY_GIT_COMMIT_SHA="not-a-release-or-secret";
  response=GET();assert.deepEqual(await response.json(),{revision:null});
 }finally{if(previous===undefined)delete process.env.RAILWAY_GIT_COMMIT_SHA;else process.env.RAILWAY_GIT_COMMIT_SHA=previous;}
});
