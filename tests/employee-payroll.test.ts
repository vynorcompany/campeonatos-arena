import assert from "node:assert/strict";
import test from "node:test";
import { calculateEmployeePayroll, employeePayrollAmounts, employeePayrollSchema } from "../src/lib/finance/employee-payroll";
import { saveEmployeePayroll } from "../src/lib/finance/employee-payroll-service";

const payload = { userId: "employee", referenceMonth: "2026-10", fixedSalary: "2.200,00", monthlyHours: "220", overtimeHours: "10", overtimePercentage: "50", bonus: "100", benefits: "200", discount: "50", advance: "300", status: "PENDING", dueDate: "2026-11-05", paidAt: "", notes: "Teste" };

function fixture(member = true) {
  const state: { payroll: any; entry: any; payments: any[]; writes: number; memberArena?: string } = { payroll: null, entry: null, payments: [], writes: 0 };
  const tx: any = {
    $executeRaw: async () => 1, $queryRaw: async () => [],
    arenaMember: { findFirst: async ({ where }: any) => { state.memberArena = where.arenaId; return member ? { user: { id: "employee", name: "Funcionário teste" } } : null; } },
    employeePayrollEntry: {
      findUnique: async () => state.payroll ? { ...state.payroll, financialEntry: state.entry ? { ...state.entry, settlements: state.payments } : null } : null,
      upsert: async ({ create, update }: any) => { state.writes++; state.payroll = state.payroll ? { ...state.payroll, ...update } : { id: "payroll", ...create }; return state.payroll; },
    },
    financialEntry: {
      findUnique: async () => ({ ...state.entry, settlements: state.payments }),
      create: async ({ data }: any) => { state.writes++; state.entry = { id: "payable", ...data }; return state.entry; },
      update: async ({ data }: any) => { state.writes++; state.entry = { ...state.entry, ...data }; return state.entry; },
    },
    financialSettlement: { create: async ({ data }: any) => { state.writes++; state.payments.push({ interestCents: 0, ...data }); return data; } },
  };
  return { tx, state };
}

test("employee payroll calculates fractional overtime and deductions in cents", () => {
  const amounts = employeePayrollAmounts(employeePayrollSchema.parse(payload));
  assert.deepEqual(calculateEmployeePayroll(amounts), { overtimeCents: 15000, grossCents: 265000, deductionsCents: 35000, totalCents: 230000 });
  assert.equal(calculateEmployeePayroll({ ...amounts, overtimeMinutes: 75, overtimePercentage: 100 }).overtimeCents, 2500);
});

test("payroll rejects invalid months, impossible dates, missing payment dates and invalid money", () => {
  for (const change of [{ referenceMonth: "2026-13" }, { dueDate: "2026-02-30" }, { status: "PAID", paidAt: "" }, { fixedSalary: "-1" }, { fixedSalary: "abc" }, { monthlyHours: "0" }, { overtimeHours: "-2" }, { overtimePercentage: "NaN" }]) {
    assert.equal(employeePayrollSchema.safeParse({ ...payload, ...change }).success, false, JSON.stringify(change));
  }
});

test("saving the same employee and month updates a single payable", async () => {
  const { tx, state } = fixture();
  await saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse(payload));
  assert.equal(state.entry.type, "EXPENSE");
  assert.equal(state.entry.source, "EMPLOYEE_PAYROLL");
  assert.equal(state.entry.status, "PENDING");
  assert.equal(state.entry.amountCents, 230000);
  assert.equal(state.entry.dueDate.toISOString(), "2026-11-05T12:00:00.000Z");
  assert.equal(state.payroll.financialEntryId, "payable");
  await saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse({ ...payload, bonus: "200" }));
  assert.equal(state.entry.id, "payable");
  assert.equal(state.entry.amountCents, 240000);
  assert.equal(state.payroll.id, "payroll");
  assert.equal(state.payments.length, 0);
});

test("paid payroll records the specified date and does not repeat the payment", async () => {
  const { tx, state } = fixture();
  const input = employeePayrollSchema.parse({ ...payload, status: "PAID", paidAt: "2026-10-30" });
  await saveEmployeePayroll(tx, "arena", input);
  assert.equal(state.entry.paidAt.toISOString(), "2026-10-30T12:00:00.000Z");
  assert.equal(state.payments.length, 1);
  assert.equal(state.payments[0].amountCents, 230000);
  await saveEmployeePayroll(tx, "arena", input);
  assert.equal(state.payments.length, 1);
  await assert.rejects(saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse(payload)), /já foi paga/);
  await assert.rejects(saveEmployeePayroll(tx, "arena", { ...input, bonus: input.bonus + 1 }), /total alterado/);
  await assert.rejects(saveEmployeePayroll(tx, "arena", { ...input, paidAt: "2026-10-31" }), /data de um pagamento/);
});

test("partial payments from accounts payable are retained when paying the remainder", async () => {
  const { tx, state } = fixture();
  await saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse(payload));
  state.payments.push({ amountCents: 100000, interestCents: 500, paidAt: new Date("2026-10-20") });
  await saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse({ ...payload, status: "PAID", paidAt: "2026-10-30" }));
  assert.equal(state.payments.length, 2);
  assert.equal(state.payments[1].amountCents, 130500);
  assert.equal(state.entry.status, "PAID");
});

test("payroll cannot use users outside the arena or edit a voided payable", async () => {
  const denied = fixture(false);
  await assert.rejects(saveEmployeePayroll(denied.tx, "arena", employeePayrollSchema.parse(payload)), /nesta arena/);
  assert.equal(denied.state.memberArena, "arena");
  assert.equal(denied.state.writes, 0);
  const { tx, state } = fixture();
  await saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse(payload));
  state.entry.status = "VOIDED";
  await assert.rejects(saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse(payload)), /cancelado/);
});

test("net salary must stay positive and a deleted payable can be recreated without duplicating the payroll", async () => {
  const { tx, state } = fixture();
  await assert.rejects(saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse({ ...payload, discount: "9999" })), /total líquido/);
  assert.equal(state.writes, 0);
  await assert.rejects(saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse({ ...payload, fixedSalary: "1000000", monthlyHours: "1", overtimeHours: "30", overtimePercentage: "0", discount: "20000000", advance: "10000000" })), /dentro do limite/);
  await saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse(payload));
  state.entry = null;
  await saveEmployeePayroll(tx, "arena", employeePayrollSchema.parse(payload));
  assert.equal(state.payroll.id, "payroll");
  assert.equal(state.entry.amountCents, 230000);
});
