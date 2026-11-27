import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {comandaListQuerySchema,comandaDocumentQuerySchema,comandaListSchema} from "../src/lib/backend/contracts/comanda-queries";
test("comanda read contracts reject caller authority and impossible dates",()=>{
 assert.ok(comandaListQuerySchema.safeParse({date:"2040-02-29",search:"Cliente"}).success);
 for(const query of [{date:"2040-02-31"},{arenaId:"foreign"},{playerId:"foreign"}])assert.equal(comandaListQuerySchema.safeParse(query).success,false);
 assert.equal(comandaDocumentQuerySchema.safeParse({id:"own",view:"print",arenaId:"foreign"}).success,false);
 assert.equal(comandaDocumentQuerySchema.safeParse({id:"own",view:"raw"}).success,false);
});
test("comanda renderer reads only backend models, without database or provider imports",()=>{
 for(const path of ["src/app/(app)/comandas/page.tsx","src/app/(app)/comandas/[comandaId]/page.tsx","src/app/imprimir/comanda/[comandaId]/page.tsx"]){const source=readFileSync(path,"utf8");assert.doesNotMatch(source,/withArenaTransaction|arenaDatabase|prisma\.|@prisma\/client|bookingServicesInclude/);assert.match(source,/getComanda(List|Document)/);}
 assert.equal(comandaListSchema.safeParse({passwordHash:"private"}).success,false);
});
