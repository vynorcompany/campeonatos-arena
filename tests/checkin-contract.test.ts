import assert from "node:assert/strict";
import test from "node:test";
import{readFileSync}from"node:fs";
import{checkinInputSchema,checkinOutcomeSchema,checkinSettingsSchema,checkinViewInputSchema}from"../src/lib/backend/contracts/checkin";
import{CheckinOperationError,publicCheckinError}from"../src/lib/backend/checkin-operation-error";
import{AcademyOperationError}from"../src/lib/backend/academy-operation-error";
test("checkin contracts reject authority overrides, duplicate scalars and unsafe shared paths",()=>{
 const fields={arenaSlug:["own"],token:["a".repeat(64)],occurrenceId:["game"],courtId:["court"],playerIds:["own","invited"]};
 assert.ok(checkinInputSchema("court").safeParse({fields}).success);
 for(const extra of[{actorId:["foreign"]},{arenaId:["foreign"]},{token:["a","b"]}])assert.equal(checkinInputSchema("court").safeParse({fields:{...fields,...extra}}).success,false);
 assert.equal(checkinInputSchema("court").safeParse({fields:{...fields,playerIds:Array(65).fill("own")}}).success,false);
 assert.equal(checkinViewInputSchema.safeParse({arenaSlug:"own",token:"a".repeat(64),playerId:"foreign"}).success,false);
 for(const path of["https://evil.invalid","//evil.invalid","/checkin/own\\evil","/checkin/own\nheader"])assert.equal(checkinOutcomeSchema.safeParse({error:null,path}).success,false);
 assert.ok(checkinSettingsSchema.safeParse({slug:"own",checkinEnabled:false,checkinMode:"SELF",checkinToken:null,blockOverdueLessons:false}).success);
});
test("checkin error projection exposes only deliberate domain failures",()=>{
 assert.equal(publicCheckinError(new Error("private-provider-secret")),null);
 assert.equal(publicCheckinError(new CheckinOperationError("QR desativado")),"QR desativado");
 assert.equal(publicCheckinError(new AcademyOperationError("Saldo insuficiente")),"Saldo insuficiente");
});
test("checkin frontend actions and renderers contain no direct database or domain write",()=>{
 for(const file of["src/lib/actions/checkin.ts","src/app/checkin/[arenaSlug]/page.tsx","src/app/(app)/configuracoes/checkin/page.tsx"]){const source=readFileSync(file,"utf8");assert.doesNotMatch(source,/arenaDatabase|withArenaTransaction|prisma\.|@prisma\/client/);}
});
