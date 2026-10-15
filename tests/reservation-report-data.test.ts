import assert from "node:assert/strict";
import test from "node:test";
import { loadReservationReportOccurrences } from "../src/lib/reports/reservation-report-data";

test("reservation metrics include records beyond the 250 displayed rows in the same arena and court scope", async () => {
  const records = Array.from({ length: 251 }, (_, index) => ({ id: `occurrence-${index}` }));
  const queries: Array<Record<string, unknown>> = [];
  const db = { scheduleOccurrence: { findMany: async (query: Record<string, unknown>) => {
    queries.push(query);
    return query.take ? records.slice(0, Number(query.take)) : records;
  } } } as unknown as Parameters<typeof loadReservationReportOccurrences>[0];
  const where = { arenaId: "arena-a", occurrenceCourts: { some: { courtId: { in: ["court-a"] } } } };

  const [metrics, rows] = await loadReservationReportOccurrences(db, where);

  assert.equal(metrics.length, 251);
  assert.equal(rows.length, 250);
  assert.equal(queries[0]?.take, undefined);
  assert.equal(queries[1]?.take, 250);
  assert.equal(queries[0]?.where, where);
  assert.equal(queries[1]?.where, where);
});
