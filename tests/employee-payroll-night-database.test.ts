import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import type { ArenaTransaction } from "../src/lib/rls";
import { employeePayrollSchema } from "../src/lib/finance/employee-payroll";
import { saveEmployeePayroll } from "../src/lib/finance/employee-payroll-service";
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposable = (() => { try {const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";} catch {return false;} })();
test("night payroll persists its breakdown and settles one payable without duplicate receipts", {skip:!disposable},async()=>{
 const db=new PrismaClient({datasources:{db:{url:testUrl}}});const rollback=new Error("rollback night payroll");
 try {
  const arena=await db.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}});
  await assert.rejects(db.$transaction(async tx=>{
   const user=await tx.user.create({data:{name:"Funcionário noturno de teste",email:`night-${randomUUID()}@example.invalid`,passwordHash:"test-only"}});
   await tx.arenaMember.create({data:{arenaId:arena.id,userId:user.id}});
   const input=employeePayrollSchema.parse({userId:user.id,referenceMonth:"2038-02",fixedSalary:"2200",monthlyHours:"220",overtimeHours:"0",overtimePercentage:50,nightHours:"7",nightOvertimeHours:"1,75",bonus:"0",benefits:"0",discount:"0",advance:"0",status:"PENDING",dueDate:"2038-03-05"});
   const ownTx=tx as unknown as ArenaTransaction;
   const row=await saveEmployeePayroll(ownTx,arena.id,input);
   assert.equal(row.nightMinutes,420);assert.equal(row.nightCents,1600);assert.equal(row.nightOvertimeCents,3600);assert.equal(row.nightHourMinutes,52.5);
   await saveEmployeePayroll(ownTx,arena.id,input);
   assert.equal(await tx.financialEntry.count({where:{arenaId:arena.id,externalReference:`${arena.id}:${user.id}:2038-02`}}),1);
   const paid={...input,status:"PAID" as const,paidAt:"2038-03-06"};
   await saveEmployeePayroll(ownTx,arena.id,paid);await saveEmployeePayroll(ownTx,arena.id,paid);
   const entry=await tx.financialEntry.findUniqueOrThrow({where:{id:row.financialEntryId!},include:{settlements:true}});
   assert.equal(entry.amountCents,225200);assert.equal(entry.status,"PAID");assert.equal(entry.settlements.length,1);assert.equal(entry.settlements[0].amountCents,225200);
   await assert.rejects(saveEmployeePayroll(ownTx,arena.id,{...paid,nightHours:480}),/total alterado/);
   throw rollback;
  }),error=>error===rollback);
 } finally {await db.$disconnect();}
});
