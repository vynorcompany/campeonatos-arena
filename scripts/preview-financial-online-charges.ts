import { PrismaClient } from "@prisma/client";
import { recurringBoletoEntryWhere, recurringBoletoIssueDeadline } from "@/lib/payments/recurring-charge-eligibility";

const databaseUrl = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("O endereço do banco não está configurado.");
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

// Read-only preview before enabling the daily cron. Counts are an upper bound:
// payer details and the remaining balance are checked again during issuance.
async function main() {
  if (process.argv[2] !== "--preview") throw new Error("Use --preview para conferir a fila sem emitir cobranças.");

  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const deadline = recurringBoletoIssueDeadline(now);
  const arenas = await prisma.arena.findMany({ select: { id: true } });
  let overdue = 0;
  let upcoming = 0;
  let failures = 0;

  for (let index = 0; index < arenas.length; index += 8) {
    const batch = await Promise.allSettled(arenas.slice(index, index + 8).map(async ({ id }) => {
      return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`;
        return Promise.all([
          tx.financialEntry.count({ where: { ...recurringBoletoEntryWhere(id), dueDate: { lt: today } } }),
          tx.financialEntry.count({ where: { ...recurringBoletoEntryWhere(id), dueDate: { gte: today, lte: deadline } } }),
        ]);
      });
    }));
    for (const result of batch) {
      if (result.status === "fulfilled") {
        overdue += result.value[0];
        upcoming += result.value[1];
      } else failures += 1;
    }
  }

  console.log(JSON.stringify({ arenas: arenas.length, overdue, upcomingWithin15Days: upcoming, failures }));
  if (failures) process.exitCode = 1;
}

main()
  .catch((error) => { console.error("Não foi possível conferir a fila de boletos.", error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
