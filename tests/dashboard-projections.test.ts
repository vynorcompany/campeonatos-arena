import assert from "node:assert/strict";
import test from "node:test";
import { allocateDashboardCourts, dashboardCourtOccupancy, projectDashboardAmounts } from "../src/lib/reports/dashboard-projections";
import { dashboardPeriod, shiftDashboardPeriod } from "../src/lib/reports/dashboard-period";
import { dashboardFinancialRows } from "../src/lib/reports/dashboard-data";
import { buildDashboardAnalytics } from "../src/lib/reports/dashboard-analytics";
const date = (day: string) => new Date(`${day}T12:00:00`);
const from = new Date("2026-01-01T00:00:00"), to = new Date("2026-01-31T23:59:59.999");
const entry = (extra: any = {}) => ({ id: "entry", type: "REVENUE", status: "PENDING", amountCents: 10000, dueDate: date("2026-01-05"), paidAt: null, recurrenceId: null, settlements: [], description: "Receita", counterpartyName: "Cliente", playerId: "p1", player: { id: "p1", name: "Cliente" }, sale: null, scheduleParticipant: null, category: "Reservas", paymentMethod: "", ...extra });

test("future projections anchor short months, respect next due/end dates and never recreate paid or voided recurrence occurrences", () => {
  const recurrence = { id: "r", type: "REVENUE", active: true, amountCents: 10000, startsAt: date("2026-01-31"), endsAt: date("2026-04-30"), nextDueDate: date("2026-01-31"), frequency: "MONTHLY", description: "Mensalidade", counterpartyName: "Cliente", playerId: "p1" };
  const existing = [entry({ id: "jan", recurrenceId: "r", dueDate: date("2026-01-31"), settlements: [{ amountCents: 3000 }] }), entry({ id: "feb", recurrenceId: "r", dueDate: date("2026-02-28"), status: "VOIDED" })];
  const projected = projectDashboardAmounts(existing, [recurrence], from, date("2026-05-31"));
  assert.deepEqual(projected.map(item => [item.date.getMonth() + 1, item.date.getDate(), item.amountCents, item.outstandingCents]), [[1, 31, 10000, 7000], [3, 31, 10000, 10000], [4, 30, 10000, 10000]]);
  assert.equal(projectDashboardAmounts([], [{ ...recurrence, active: false }], from, to).length, 0);
  assert.equal(projectDashboardAmounts([], [{ ...recurrence, nextDueDate: date("2026-02-28") }], from, to).length, 0);
});

test("court revenue allocation reconciles every cent and deduplicates courts", () => {
  assert.deepEqual(allocateDashboardCourts(101, [{ id: "b", name: "B" }, { id: "a", name: "A" }, { id: "a", name: "A" }]).map(item => [item.id, item.value]), [["a", 51], ["b", 50]]);
  assert.deepEqual(allocateDashboardCourts(100, []), []);
});

test("cash view counts partial receipts at their own date and payment method, without counting a fully paid parent twice", () => {
  const rows = dashboardFinancialRows([entry({ status: "PAID", amountCents: 10000, paidAt: date("2026-01-15"), settlements: [{ id: "s1", amountCents: 4000, paidAt: date("2025-12-15"), paymentMethod: "Pix" }, { id: "s2", amountCents: 6000, paidAt: date("2026-01-15"), paymentMethod: "Dinheiro" }] }), entry({ id: "void", status: "VOIDED", paidAt: date("2026-01-10") })] as any, "caixa", from, to);
  assert.equal(rows.length, 1); assert.equal(rows[0].value, 6000); assert.equal(rows[0].paymentMethod, "Dinheiro");
});

test("dashboard supports next-month boundaries across years and rejects invalid or excessive date ranges", () => {
  const period = dashboardPeriod("2027-01-01", "2027-01-31", date("2026-12-20"));
  assert.equal(period.error, undefined); if (period.error) return;
  assert.equal(period.from.getFullYear(), 2027); assert.equal(period.to.getDate(), 31);
  assert.ok(dashboardPeriod("2026-02-30", "2026-03-01").error);
  assert.ok(dashboardPeriod("2026-02-02", "2026-02-01").error);
  assert.ok(dashboardPeriod("2026-01-01", "2028-01-01").error);
  const shifted = shiftDashboardPeriod(new Date("2026-03-01T00:00:00"), new Date("2026-03-31T00:00:00"), -1);
  assert.equal(shifted.from.getMonth(), 1); assert.equal(shifted.to.getMonth(), 1); assert.equal(shifted.to.getDate(), 28);
});

test("dashboard reconciles forecasts, arrears, customer ticket, product margin and operating rates without counting blocks or expired holds", () => {
  const court = { id: "court", name: "Quadra A" };
  const occurrence = (id: string, extra: any = {}) => ({ id, title: id, sourceType: "BOOKING", bookingTypeName: "Reserva", status: "SCHEDULED", createdAt: date("2026-01-01"), startsAt: date("2026-01-25"), endsAt: new Date("2026-01-25T13:00:00"), bookingSeriesId: null, teacherId: null, teacher: null, occurrenceCourts: [{ courtId: court.id, court }], participants: [], ...extra });
  const participant = (id: string, amountCents: number, financialEntryId: string | null = null) => ({ id: `part-${id}`, playerId: id, player: { name: id }, amountCents, paymentMethod: "", financialEntryId, financialEntry: financialEntryId ? { status: "PENDING" } : null });
  const data: any = {
    entries: [entry({ settlements: [{ id: "s1", amountCents: 2000, interestCents: 0, paidAt: date("2026-01-08"), paymentMethod: "Pix" }, { id: "s2", amountCents: 1000, interestCents: 0, paidAt: date("2026-01-10"), paymentMethod: "Dinheiro" }], scheduleParticipant: { playerId: "p1", player: { name: "p1" }, occurrence: { occurrenceCourts: [{ courtId: court.id, court }] } } }), entry({ id: "paid", status: "PAID", amountCents: 5000, playerId: "p2", player: { id: "p2", name: "p2" }, dueDate: date("2026-01-10"), paidAt: date("2026-01-10"), paymentMethod: "Pix" }), entry({ id: "expense", type: "EXPENSE", status: "PAID", amountCents: 9000, dueDate: date("2026-01-10"), paidAt: date("2026-01-10") })],
    recurrences: [{ id: "rec", type: "REVENUE", active: true, amountCents: 7000, startsAt: date("2026-01-25"), nextDueDate: date("2026-01-25"), endsAt: date("2026-02-25"), frequency: "MONTHLY", description: "Plano", counterpartyName: "p1", playerId: "p1" }],
    occurrences: [occurrence("fixed", { bookingSeriesId: "series", participants: [participant("p1", 10000, "entry")] }), occurrence("free", { participants: [participant("p2", 0)] }), occurrence("lesson", { bookingTypeName: "Aula fixa", teacherId: "teacher", teacher: { name: "Professor" }, participants: [participant("p3", 6000)] }), occurrence("cancelled", { status: "CANCELED" }), occurrence("blocked", { bookingTypeName: "Bloqueio" }), occurrence("expired", { status: "PENDING_PAYMENT" })],
    courts: [{ ...court, weeklyRules: [{ weekday: 0, startsAtMinute: 0, endsAtMinute: 1440, available: true }] }],
    lessons: [{ id: "lesson-legacy", title: "Aula avulsa", scheduledAt: date("2026-01-10"), teacherId: "teacher", teacher: { name: "Professor" }, attendances: [{ studentId: "s4", status: "PRESENT", student: { playerId: "p4", name: "p4" } }, { studentId: "s5", status: "ABSENT", student: { playerId: "p5", name: "p5" } }] }],
    portalAccounts: [], saleGroups: [{ productId: "product", _sum: { quantity: 2, totalCents: 10000 } }, { productId: "service", _sum: { quantity: 1, totalCents: 99999 } }], products: [{ id: "product", name: "Produto", isService: false, costCents: 3000 }, { id: "service", name: "Serviço", isService: true, costCents: 0 }], previousEntries: [], previousReservations: 0,
  };
  const result = buildDashboardAnalytics(data, from, to, new Date("2026-02-28T23:59:59"), "caixa", undefined, date("2026-01-20"));
  const card = (id: string) => result.cards.find(item => item.id === id)!;
  assert.equal(card("income").tone, "positive");
  assert.equal(card("expense").tone, "negative");
  assert.equal(card("to-receive").tone, "positive");
  assert.equal(card("forecast").tone, "positive");
  assert.equal(card("delinquency").tone, "negative");
  assert.equal(card("product-profit").tone, "positive");
  assert.ok(card("income").items.every(item => item.tone === "positive"));
  assert.ok(card("expense").items.every(item => item.tone === "negative"));
  assert.ok(card("delinquency").items.every(item => item.tone === "negative"));
  const loss = buildDashboardAnalytics({ ...data, products: data.products.map((product: any) => ({ ...product, costCents: 9000 })) }, from, to, to, "caixa");
  assert.equal(loss.cards.find(card => card.id === "product-profit")?.tone, "negative");
  assert.equal(loss.cards.find(card => card.id === "product-profit")?.items[0].tone, "negative");
  assert.equal(result.received, 8000); assert.equal(result.paid, 9000); assert.equal(card("result").tone, "negative");
  assert.match(String(card("to-receive").value), /200,00/); assert.match(String(card("forecast").value), /280,00/);
  assert.match(String(card("delinquency").value), /70,00/); assert.equal(card("delinquency").secondary, "46,7%");
  assert.match(String(card("ticket").value), /40,00/); assert.match(String(card("product-profit").value), /40,00/); assert.equal(card("product-profit").secondary, "40%");
  assert.equal(card("active-clients").value, 4); assert.equal(card("reservations").value, 2); assert.match(card("reservations").caption, /33,3%.*1 canceladas/);
  assert.equal(card("fixed-reservations").value, 1); assert.equal(card("fixed-reservations").secondary, "50%");
  assert.equal(card("lessons").value, 2); assert.equal(card("fixed-lessons").value, 1); assert.equal(card("uncharged").value, 1); assert.equal(card("uncharged").secondary, "50%");
  assert.equal(result.lessonsByTeacher[0].value, 2);
  assert.equal(result.courtRevenue.reduce((total, item) => total + item.value, 0), result.received);
  assert.equal(result.forecastCourts.reduce((total, item) => total + item.value, 0), 28000);
  assert.equal(result.methods.reduce((total, item) => total + item.value, 0), result.received);
  assert.equal(result.months.reduce((total, item) => total + item.value, 0), 35000);
});

test("empty periods preserve unavailable ratios and never invent growth from a zero comparison", () => {
  const data: any = { entries: [], recurrences: [], occurrences: [], courts: [], lessons: [], portalAccounts: [], saleGroups: [], products: [], previousEntries: [], previousReservations: 0 };
  const result = buildDashboardAnalytics(data, from, to, to, "caixa", { from, to });
  for (const id of ["delinquency", "product-profit", "fixed-reservations", "uncharged"]) assert.equal(result.cards.find(card => card.id === id)?.secondary, "—");
  assert.equal(result.cards.find(card => card.id === "occupancy")?.value, "—");
  assert.ok(result.cards.every(card => !card.comparison));
  assert.ok(!JSON.stringify(result).match(/NaN|Infinity/));
});

test("occupancy merges overlapping rules and bookings and excludes booked minutes outside operating hours", () => {
  const start = new Date("2026-09-14T00:00:00"), end = new Date("2026-09-14T23:59:59.999");
  const courts = [{ id: "court", name: "Quadra", weeklyRules: [{ weekday: 1, startsAtMinute: 480, endsAtMinute: 600, available: true }, { weekday: 1, startsAtMinute: 540, endsAtMinute: 600, available: true }] }];
  const booking = (from: string, to: string) => ({ startsAt: new Date(`2026-09-14T${from}:00`), endsAt: new Date(`2026-09-14T${to}:00`), occurrenceCourts: [{ courtId: "court" }] });
  const result = dashboardCourtOccupancy(courts, [booking("07:00", "08:30"), booking("08:00", "09:00")], start, end);
  assert.equal(result.availableMinutes, 120); assert.equal(result.occupiedMinutes, 60);
  assert.equal(result.courtInsights[0].reservations, 2);
});

test("cash periods follow the arena timezone rather than UTC midnight", () => {
  const start = new Date("2026-11-01T00:00:00"), end = new Date("2026-11-30T23:59:59.999");
  const rows = dashboardFinancialRows([
    entry({ id: "october-local", status: "PAID", paidAt: new Date("2026-11-01T01:00:00Z"), amountCents: 1000 }),
    entry({ id: "november-local", status: "PAID", paidAt: new Date("2026-12-01T01:00:00Z"), amountCents: 2000 }),
  ] as any, "caixa", start, end);
  assert.equal(rows.length, 1); assert.equal(rows[0].id, "november-local"); assert.equal(rows[0].value, 2000);
  assert.equal(rows[0].date.getDate(), 30); assert.equal(rows[0].date.getMonth(), 10);
});

test("forecast gross revenue includes already recorded interest so outstanding never exceeds its charge total", () => {
  const result = projectDashboardAmounts([entry({ settlements: [{ amountCents: 2000, interestCents: 1000 }] })], [], from, to);
  assert.equal(result[0].amountCents, 11000); assert.equal(result[0].outstandingCents, 9000);
});
