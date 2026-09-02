import { prisma } from "@/lib/prisma";
import { getLeagueMonthBlocks } from "@/lib/league/monthly-schedule";

function dateTimeLabel(value: Date) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value); }
function leagueWeekPeriod(referenceMonth: string | null | undefined, block: number | null) {
  if (!referenceMonth || !block || block < 1 || block > 4) return "Período a definir";
  const [year, month] = referenceMonth.split("-").map(Number);
  const period = getLeagueMonthBlocks(year, month)[block - 1];
  return period ? `${period.startsOn.split("-").reverse().join("/")} a ${period.endsOn.split("-").reverse().join("/")}` : "Período a definir";
}

export async function getPublicLeaguePortal(arenaSlug: string, playerId: string, requestedCategoryId?: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true, scheduleStartMinute: true, scheduleEndMinute: true, courts: { where: { active: true }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } } });
  if (!arena) return null;
  const ownPairs = await prisma.categoryPair.findMany({ where: { active: true, players: { some: { playerId } }, competition: { format: "LEAGUE", status: "PUBLISHED", category: { tournament: { arenaId: arena.id } } } }, include: { group: true, competition: { include: { category: { include: { tournament: true } } } }, players: { include: { player: { select: { id: true, name: true } } } }, homeMatches: { include: { awayPair: { select: { id: true, name: true, groupId: true } }, leagueCycle: { select: { id: true } } } }, awayMatches: { include: { homePair: { select: { id: true, name: true, groupId: true } } } } }, orderBy: { createdAt: "asc" } });
  const challenges = await prisma.leagueMatchProposal.findMany({ where: { OR: [{ proposerPairId: { in: ownPairs.map((pair) => pair.id) } }, { opponentPairId: { in: ownPairs.map((pair) => pair.id) } }] }, include: { court: { select: { name: true } }, categoryMatch: { include: { homePair: { select: { name: true } }, awayPair: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } });
  const now = new Date();
  const [leagueNotifications, medicalRequests, replacementPlayers, prizes, reservations, student, classOccurrences, teachers, teacherManagement, classGroups] = await Promise.all([
    prisma.playerNotification.findMany({ where: { playerId, readAt: null, type: "LEAGUE_MATCH" }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, message: true, href: true } }),
    prisma.leagueMedicalSubstitutionRequest.findMany({ where: { requestedByPlayerId: playerId, status: "PENDING" }, select: { pairId: true } }),
    prisma.player.findMany({ where: { arenaId: arena.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.leagueCycle.findMany({ where: { status: "OPEN", competition: { category: { tournament: { arenaId: arena.id } } }, prizeDescription: { not: "" } }, include: { competition: { include: { category: { include: { tournament: true } } } } }, orderBy: { referenceMonth: "desc" } }),
    prisma.scheduleOccurrence.findMany({ where: { arenaId: arena.id, startsAt: { gte: now }, status: { not: "CANCELED" }, participants: { some: { playerId } } }, include: { occurrenceCourts: { include: { court: { select: { name: true } } } } }, orderBy: { startsAt: "asc" }, take: 12 }),
    prisma.student.findFirst({
      where: { arenaId: arena.id, playerId },
      include: {
        subscriptions: { where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1, include: { plan: { select: { name: true } } } },
        teacherAssignments: { where: { active: true }, include: { teacher: { select: { id: true, name: true } } }, orderBy: { teacher: { name: "asc" } } },
        attendances: {
          where: { lesson: { scheduledAt: { gte: now } } },
          include: { lesson: { select: { id: true, title: true, scheduledAt: true, status: true, teacher: { select: { name: true } } } } },
          take: 12,
        },
      },
    }),
    prisma.scheduleOccurrence.findMany({ where: { arenaId: arena.id, startsAt: { gte: now }, status: { not: "CANCELED" }, teacherId: { not: null } }, include: { teacher: { select: { id: true, name: true } } }, orderBy: { startsAt: "asc" }, take: 48 }),
    prisma.teacher.findMany({ where: { arenaId: arena.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.teacher.findFirst({
      where: { arenaId: arena.id, playerId, active: true },
      include: {
        planAssignments: { where: { active: true }, include: { plan: { select: { id: true, name: true, classesPerMonth: true, monthlyPriceCents: true } } }, orderBy: { plan: { name: "asc" } } },
        studentAssignments: {
          where: { active: true },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                remainingClasses: true,
                subscriptions: { where: { status: "ACTIVE" }, include: { plan: { select: { name: true } } }, take: 1 },
              },
            },
          },
          orderBy: { student: { name: "asc" } },
        },
        scheduleOccurrences: { where: { startsAt: { gte: now }, status: { not: "CANCELED" } }, select: { id: true, title: true, startsAt: true, endsAt: true, status: true }, orderBy: { startsAt: "asc" }, take: 20 },
        classGroups: { where: { active: true }, include: { schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }, enrollments: { where: { status: "ACTIVE" }, include: { student: { select: { id: true, name: true } } } } }, orderBy: { name: "asc" } },
      },
    }),
    prisma.classGroup.findMany({
      where: { arenaId: arena.id, active: true },
      include: {
        teacher: { select: { id: true, name: true } },
        schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
        enrollments: { where: { status: "ACTIVE" }, select: { id: true, studentId: true } },
        requests: { where: { student: { playerId }, status: "PENDING" }, select: { id: true } }
      },
      orderBy: { name: "asc" }
    }),
  ]);
  const occurrences = await prisma.scheduleOccurrence.findMany({ where: { arenaId: arena.id, status: { not: "CANCELED" }, startsAt: { gte: now, lt: new Date(now.getTime() + 8 * 24 * 60 * 60_000) } }, include: { occurrenceCourts: true } });
  const leagueCompetitions = await prisma.categoryCompetition.findMany({
    where: { format: "LEAGUE", status: "PUBLISHED", category: { active: true, tournament: { arenaId: arena.id } } },
    orderBy: [{ category: { tournament: { name: "asc" } } }, { category: { name: "asc" } }],
    include: {
      category: { include: { tournament: { select: { name: true } } } },
      pairs: { where: { active: true }, orderBy: { drawOrder: "asc" }, include: { group: true, players: { include: { player: { select: { id: true, name: true } } } } } },
      matches: { orderBy: [{ leagueBlock: "asc" }, { roundOrder: "asc" }], include: { homePair: { select: { name: true } }, awayPair: { select: { name: true } }, winnerPair: { select: { id: true } }, leagueCycle: { select: { referenceMonth: true } } } },
    },
  });
  const ownCompetitionIds = new Set(ownPairs.map((pair) => pair.competitionId));
  const selectedLeagueCompetition = leagueCompetitions.find((competition) => competition.categoryId === requestedCategoryId) ?? leagueCompetitions.find((competition) => ownCompetitionIds.has(competition.id)) ?? leagueCompetitions[0] ?? null;
  const leagueCategories = leagueCompetitions.map((competition) => ({ id: competition.categoryId, label: `${competition.category.name} · ${competition.category.tournament.name}`, member: ownCompetitionIds.has(competition.id), registrationFeeCents: competition.registrationFeeCents }));
  const selectedLeaguePairs = selectedLeagueCompetition?.pairs.map((pair) => ({ id: pair.id, name: pair.name, groupName: pair.group?.name ?? "", players: pair.players.map((entry) => ({ id: entry.player.id, name: entry.player.name })) })) ?? [];
  const leagueResults = selectedLeagueCompetition?.matches.map((match) => ({ id: match.id, block: match.leagueBlock, period: leagueWeekPeriod(match.leagueCycle?.referenceMonth, match.leagueBlock), homePairName: match.homePair?.name ?? "Dupla a definir", awayPairName: match.awayPair?.name ?? "Dupla a definir", homeScore: match.homeScore, awayScore: match.awayScore, finished: Boolean(match.winnerPairId) })) ?? [];
  const slots = arena.courts.flatMap((court) => Array.from({ length: 7 }, (_, dayOffset) => {
    const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + dayOffset);
    const rule = court.weeklyRules.find((item) => item.weekday === date.getDay() && item.available);
    if (!rule) return [];
    const duration = court.onlineDurationMinutes[0] ?? 60;
    return Array.from({ length: Math.max(0, Math.floor((rule.endsAtMinute - rule.startsAtMinute - duration) / court.onlineSlotMinutes) + 1) }, (_, index) => rule.startsAtMinute + index * court.onlineSlotMinutes).flatMap((minute) => {
      const startsAt = new Date(date); startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const endsAt = new Date(startsAt.getTime() + duration * 60_000);
      if (startsAt <= now || occurrences.some((occurrence) => occurrence.occurrenceCourts.some((entry) => entry.courtId === court.id) && occurrence.startsAt < endsAt && occurrence.endsAt > startsAt)) return [];
      return [{ value: `${court.id}|${startsAt.toISOString()}|${duration}`, label: `${court.name} · ${dateTimeLabel(startsAt)} · ${duration / 60}h` }];
    });
  })).flat();
  return {
    arenaSlug,
    leagueCategories,
    selectedLeagueCategoryId: selectedLeagueCompetition?.categoryId ?? null,
    selectedLeaguePairs,
    leagueResults,
    pairs: ownPairs.map((pair) => ({ id: pair.id, categoryId: pair.competition.categoryId, name: pair.name, categoryName: pair.competition.category.name, eventName: pair.competition.category.tournament.name, groupName: pair.group?.name ?? "", players: pair.players.map((entry) => ({ id: entry.player.id, name: entry.player.name })), medicalRequestPending: medicalRequests.some((request) => request.pairId === pair.id), opponents: pair.homeMatches.filter((match) => !match.winnerPairId && match.leagueCycleId).map((match) => ({ matchId: match.id, pair: match.awayPair, block: match.leagueBlock })).filter((item): item is { matchId: string; block: number | null; pair: { id: string; name: string; groupId: string | null } } => Boolean(item.pair) && item.pair!.id !== pair.id && (!pair.groupId || item.pair!.groupId === pair.groupId)).map((item) => ({ matchId: item.matchId, id: item.pair.id, name: item.pair.name, block: item.block })) })),
    challenges: challenges.map((challenge) => ({ id: challenge.id, categoryId: challenge.categoryMatch.competitionId, status: challenge.status, opponent: challenge.categoryMatch.awayPair?.name ?? "Dupla visitante", proposer: challenge.categoryMatch.homePair?.name ?? "Dupla mandante", court: challenge.court.name, proposedAt: dateTimeLabel(challenge.startsAt), responseDueAt: dateTimeLabel(challenge.responseDueAt), block: challenge.categoryMatch.leagueBlock, incoming: ownPairs.some((pair) => pair.id === challenge.opponentPairId) })),
    leagueNotifications,
    slots,
    replacementPlayers,
    prizes: prizes.map((cycle) => ({ id: cycle.id, eventName: cycle.competition.category.tournament.name, categoryName: cycle.competition.category.name, description: cycle.prizeDescription })),
    reservations: reservations.map((reservation) => ({ id: reservation.id, title: reservation.title, courtName: reservation.occurrenceCourts.map((entry) => entry.court.name).join(" · ") || "Quadra a definir", when: dateTimeLabel(reservation.startsAt), status: reservation.status === "CONFIRMED" ? "Confirmada" : reservation.status === "PENDING" ? "Aguardando confirmação" : "Agendada" })),
    lessons: student?.attendances.map((attendance) => ({ id: attendance.lesson.id, title: attendance.lesson.title, teacherName: attendance.lesson.teacher?.name ?? "", when: attendance.lesson.scheduledAt ? dateTimeLabel(attendance.lesson.scheduledAt) : "Horário a definir", status: attendance.lesson.status === "CANCELED" ? "Cancelada" : "Agendada" })) ?? [],
    teachers,
    classes: classOccurrences.map((occurrence) => ({ id: occurrence.id, teacherId: occurrence.teacher?.id ?? "", teacherName: occurrence.teacher?.name ?? "Professor", title: occurrence.title, when: dateTimeLabel(occurrence.startsAt), status: occurrence.status === "PENDING_CONFIRMATION" ? "Aguardando confirmação" : "Agendada" })),
    classGroups: classGroups.map((group) => ({ id: group.id, name: group.name, teacherName: group.teacher.name, schedules: group.schedules.map((schedule) => ({ weekday: schedule.weekday, startTime: schedule.startTime, capacity: schedule.capacity })), enrolled: group.enrollments.some((enrollment) => enrollment.studentId === student?.id), requestPending: Boolean(group.requests.length), available: group.schedules.every((schedule) => group.enrollments.length < schedule.capacity) })),
    student: student ? { remainingClasses: student.remainingClasses, attendedClasses: student.attendedClasses, missedClasses: student.missedClasses, active: student.active, planName: student.subscriptions[0]?.plan.name ?? "", teacherName: student.teacherAssignments[0]?.teacher.name ?? "" } : null,
    teacherManagement: teacherManagement ? {
      plans: teacherManagement.planAssignments.map((assignment) => ({ id: assignment.plan.id, name: assignment.plan.name, classesPerMonth: assignment.plan.classesPerMonth, monthlyPriceCents: assignment.plan.monthlyPriceCents })),
      students: teacherManagement.studentAssignments.map((assignment) => ({ id: assignment.student.id, name: assignment.student.name, remainingClasses: assignment.student.remainingClasses, planName: assignment.student.subscriptions[0]?.plan.name ?? "Sem plano ativo" })),
      agenda: teacherManagement.scheduleOccurrences.map((occurrence) => ({ id: occurrence.id, title: occurrence.title, when: dateTimeLabel(occurrence.startsAt), status: occurrence.status === "PENDING_CONFIRMATION" ? "Aguardando confirmação" : "Agendada" })),
      classGroups: teacherManagement.classGroups.map((group) => ({ id: group.id, name: group.name, schedules: group.schedules.map((schedule) => ({ weekday: schedule.weekday, startTime: schedule.startTime, capacity: schedule.capacity })), enrolledCount: group.enrollments.length, students: group.enrollments.map((enrollment) => ({ id: enrollment.student.id, name: enrollment.student.name })) })),
    } : null,
  };
}
