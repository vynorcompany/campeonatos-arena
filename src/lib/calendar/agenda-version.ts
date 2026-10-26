import { createHash } from "node:crypto";
export function agendaVersion(rows: unknown) { return createHash("sha256").update(JSON.stringify(rows)).digest("hex"); }
export const agendaVersionSelect = { id: true, updatedAt: true, status: true, participants: { orderBy: { id: "asc" as const }, select: { id: true, checkedInAt: true } }, serviceReservations: { orderBy: { id: "asc" as const }, select: { id: true } } } as const;
