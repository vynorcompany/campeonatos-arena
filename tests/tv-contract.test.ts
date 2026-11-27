import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {tvViewSchema,tvMatchSchema} from "../src/lib/backend/contracts/tv";
test("TV contracts expose bounded purpose-specific views and exclude private match columns",()=>{
 assert.equal(tvViewSchema.safeParse("raw").success,false);
 const match={id:"own",displayOrder:1,homePairName:"A",awayPairName:"B",courtName:"Court",scheduledTime:"10:00",status:"LIVE"};
 assert.ok(tvMatchSchema.safeParse(match).success);assert.equal(tvMatchSchema.safeParse({...match,arenaId:"foreign",passwordHash:"private"}).success,false);
});
test("TV page renderers do not load database or private presentation sources",()=>{
 for(const path of ["src/app/proximos-jogos/tv/page.tsx","src/app/(app)/proximos-jogos/apresentacao/page.tsx"]){const source=readFileSync(path,"utf8");assert.doesNotMatch(source,/prisma\.|@\/lib\/prisma|arenaDatabase|withArenaTransaction/);assert.match(source,/getTvWorkspace/);}
});
