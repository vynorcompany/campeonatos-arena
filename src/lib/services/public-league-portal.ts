import { prisma } from "@/lib/prisma";
import { getLeagueMonthBlocks } from "@/lib/league/monthly-schedule";
import { withArenaTransaction } from "@/lib/rls";
import { getPublicLinkedPlayerIds } from "@/lib/services/public-player-link";

function dateTimeLabel(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}
function leagueWeekPeriod(
  referenceMonth: string | null | undefined,
  block: number | null,
) {
  if (!referenceMonth || !block || block < 1 || block > 4)
    return "Período a definir";
  const [year, month] = referenceMonth.split("-").map(Number);
  const period = getLeagueMonthBlocks(year, month)[block - 1];
  return period
    ? `${period.startsOn.split("-").reverse().join("/")} a ${period.endsOn.split("-").reverse().join("/")}`
    : "Período a definir";
}
function leagueMatchScheduleLabel(
  scheduledDate: string | null,
  scheduledTime: string | null,
) {
  if (!scheduledDate || !scheduledTime) return null;
  const [year, month, day] = scheduledDate.split("-");
  if (!year || !month || !day) return null;
  return `${day}/${month} às ${scheduledTime}`;
}

export async function getPublicLeaguePortal(
  arenaSlug: string,
  playerId: string,
  requestedCategoryId?: string,
) {
  const arena = await prisma.arena.findUnique({
    where: { slug: arenaSlug },
    select: {
      id: true,
      scheduleStartMinute: true,
      scheduleEndMinute: true,
      courts: {
        where: { active: true },
        include: { weeklyRules: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!arena) return null;
  const linkedPlayerIds = await getPublicLinkedPlayerIds(arena.id, playerId);
  const ownPairs = await prisma.categoryPair.findMany({
    where: {
      active: true,
      players: { some: { playerId: { in: linkedPlayerIds } } },
      competition: {
        format: "LEAGUE",
        category: { tournament: { arenaId: arena.id } },
      },
    },
    include: {
      group: true,
      competition: { include: { category: { include: { tournament: true } } } },
      players: { include: { player: { select: { id: true, name: true } } } },
      homeMatches: {
        include: {
          awayPair: { select: { id: true, name: true, groupId: true } },
          leagueCycle: { select: { id: true } },
        },
      },
      awayMatches: {
        include: {
          homePair: { select: { id: true, name: true, groupId: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const challenges = await prisma.leagueMatchProposal.findMany({
    where: {
      OR: [
        { proposerPairId: { in: ownPairs.map((pair) => pair.id) } },
        { opponentPairId: { in: ownPairs.map((pair) => pair.id) } },
      ],
    },
    include: {
      court: { select: { name: true } },
      categoryMatch: {
        include: {
          competition: { select: { categoryId: true } },
          homePair: { select: { name: true } },
          awayPair: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  const [
    leagueNotifications,
    medicalRequests,
    replacementPlayers,
    prizes,
    reservations,
    student,
    classOccurrences,
    teachers,
    teacherManagement,
    classGroups,
  ] = await withArenaTransaction(arena.id, (tx) =>
    Promise.all([
      tx.playerNotification.findMany({
        where: { playerId, readAt: null, type: "LEAGUE_MATCH" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, message: true, href: true },
      }),
      tx.leagueMedicalSubstitutionRequest.findMany({
        where: { requestedByPlayerId: playerId, status: "PENDING" },
        select: { pairId: true },
      }),
      tx.player.findMany({
        where: { arenaId: arena.id, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      tx.leagueCycle.findMany({
        where: {
          status: "OPEN",
          competition: { category: { tournament: { arenaId: arena.id } } },
          prizeDescription: { not: "" },
        },
        include: {
          competition: {
            include: { category: { include: { tournament: true } } },
          },
        },
        orderBy: { referenceMonth: "desc" },
      }),
      tx.scheduleOccurrence.findMany({
        where: {
          arenaId: arena.id,
          startsAt: { gte: now },
          status: { not: "CANCELED" },
          participants: { some: { playerId } },
        },
        include: {
          occurrenceCourts: { include: { court: { select: { name: true } } } },
        },
        orderBy: { startsAt: "asc" },
        take: 12,
      }),
      tx.student.findFirst({
        where: { arenaId: arena.id, playerId },
        include: {
          subscriptions: {
            where: { status: "ACTIVE" },
            orderBy: { startedAt: "desc" },
            take: 1,
            include: { plan: { select: { name: true } } },
          },
          monthlyBalances: {
            where: {
              referenceMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
            },
            take: 1,
          },
          teacherAssignments: {
            where: { active: true },
            include: { teacher: { select: { id: true, name: true } } },
            orderBy: { teacher: { name: "asc" } },
          },
          attendances: {
            where: { lesson: { scheduledAt: { gte: now } } },
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  scheduledAt: true,
                  status: true,
                  teacher: { select: { name: true } },
                },
              },
            },
            take: 12,
          },
        },
      }),
      tx.scheduleOccurrence.findMany({
        where: {
          arenaId: arena.id,
          startsAt: { gte: now },
          status: { not: "CANCELED" },
          teacherId: { not: null },
        },
        include: { teacher: { select: { id: true, name: true } } },
        orderBy: { startsAt: "asc" },
        take: 48,
      }),
      tx.teacher.findMany({
        where: { arenaId: arena.id, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      tx.teacher.findFirst({
        where: { arenaId: arena.id, playerId, active: true },
        include: {
          planAssignments: {
            where: { active: true },
            include: {
              plan: {
                select: {
                  id: true,
                  name: true,
                  classesPerMonth: true,
                  monthlyPriceCents: true,
                },
              },
            },
            orderBy: { plan: { name: "asc" } },
          },
          studentAssignments: {
            where: { active: true },
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  remainingClasses: true,
                  playerId: true,
                  subscriptions: {
                    where: { status: "ACTIVE" },
                    include: { plan: { select: { name: true } } },
                    take: 1,
                  },
                  classGroupEnrollments: {
                    where: { status: "ACTIVE" },
                    select: {
                      classGroup: { select: { id: true, name: true } },
                    },
                    take: 1,
                  },
                  monthlyBalances: {
                    where: {
                      referenceMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
                    },
                    take: 1,
                  },
                  attendances: {
                    where: {
                      makeupRequestedAt: { not: null },
                      makeupScheduledAt: null,
                      makeupExpiresAt: { gte: now },
                    },
                    select: { id: true, status: true },
                  },
                },
              },
            },
            orderBy: { student: { name: "asc" } },
          },
          scheduleOccurrences: {
            where: { startsAt: { gte: now }, status: { not: "CANCELED" } },
            select: {
              id: true,
              title: true,
              startsAt: true,
              endsAt: true,
              status: true,
            },
            orderBy: { startsAt: "asc" },
            take: 20,
          },
          classGroups: {
            where: { active: true },
            include: {
              schedules: {
                orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
              },
              enrollments: {
                where: { status: "ACTIVE" },
                include: { student: { select: { id: true, name: true } } },
              },
            },
            orderBy: { name: "asc" },
          },
        },
      }),
      tx.classGroup.findMany({
        where: { arenaId: arena.id, active: true },
        include: {
          teacher: { select: { id: true, name: true } },
          schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
          enrollments: {
            where: { status: "ACTIVE" },
            select: { id: true, studentId: true },
          },
          requests: {
            where: { student: { playerId }, status: "PENDING" },
            select: { id: true },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]),
  );
  const occurrences = await withArenaTransaction(arena.id, (tx) =>
    tx.scheduleOccurrence.findMany({
      where: {
        arenaId: arena.id,
        status: { not: "CANCELED" },
        startsAt: {
          gte: now,
          lt: new Date(now.getTime() + 15 * 24 * 60 * 60_000),
        },
      },
      include: { occurrenceCourts: true },
    }),
  );
  const leagueCompetitions = await prisma.categoryCompetition.findMany({
    where: {
      format: "LEAGUE",
      category: { active: true, tournament: { arenaId: arena.id } },
      OR: [
        { status: "PUBLISHED" },
        { pairs: { some: { active: true, players: { some: { playerId: { in: linkedPlayerIds } } } } } },
      ],
    },
    orderBy: [
      { category: { tournament: { name: "asc" } } },
      { category: { name: "asc" } },
    ],
    include: {
      category: { include: { tournament: { select: { name: true } } } },
      pairs: {
        where: { active: true },
        orderBy: { drawOrder: "asc" },
        include: {
          group: true,
          players: {
            include: { player: { select: { id: true, name: true } } },
          },
        },
      },
      matches: {
        orderBy: [{ leagueBlock: "asc" }, { roundOrder: "asc" }],
        include: {
          homePair: { select: { name: true } },
          awayPair: { select: { name: true } },
          winnerPair: { select: { id: true } },
          leagueCycle: { select: { referenceMonth: true } },
        },
      },
    },
  });
  const ownCompetitionIds = new Set(ownPairs.map((pair) => pair.competitionId));
  // A categoria informada na URL tem prioridade. Sem ela, a última dupla ativa
  // do atleta representa a liga atual — e não a primeira liga da arena.
  const latestOwnCompetition = [...ownPairs]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((pair) =>
      leagueCompetitions.find(
        (competition) => competition.id === pair.competitionId,
      ),
    )
    .find(Boolean);
  const selectedLeagueCompetition =
    leagueCompetitions.find(
      (competition) => competition.categoryId === requestedCategoryId,
    ) ??
    latestOwnCompetition ??
    leagueCompetitions[0] ??
    null;
  const leagueCategories = leagueCompetitions.map((competition) => ({
    id: competition.categoryId,
    label: `${competition.category.name} · ${competition.category.tournament.name}`,
    member: ownCompetitionIds.has(competition.id),
    registrationFeeCents: competition.registrationFeeCents,
  }));
  const selectedLeaguePairs =
    selectedLeagueCompetition?.pairs.map((pair) => ({
      id: pair.id,
      name: pair.name,
      groupName: pair.group?.name ?? "",
      players: pair.players.map((entry) => ({
        id: entry.player.id,
        name: entry.player.name,
      })),
    })) ?? [];
  const leagueResults =
    selectedLeagueCompetition?.matches.map((match) => ({
      id: match.id,
      block: match.leagueBlock,
      period: leagueWeekPeriod(
        match.leagueCycle?.referenceMonth,
        match.leagueBlock,
      ),
      homePairName: match.homePair?.name ?? "Dupla a definir",
      awayPairName: match.awayPair?.name ?? "Dupla a definir",
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      scheduledDate: match.scheduledDate,
      scheduledTime: match.scheduledTime,
      scheduledAtLabel: leagueMatchScheduleLabel(
        match.scheduledDate,
        match.scheduledTime,
      ),
      // Resultados antigos podem ter sido registrados antes da definição do
      // vencedor. Exibir o placar sempre que ele existir evita escondê-los
      // do portal ao encerrar a competição.
      finished:
        Boolean(match.winnerPairId) ||
        match.manualStatus === "FINISHED" ||
        (match.homeScore !== null && match.awayScore !== null),
    })) ?? [];
  const slots = arena.courts
    .flatMap((court) =>
      Array.from({ length: 7 }, (_, dayOffset) => {
        const date = new Date(now);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + dayOffset);
        const rule = court.weeklyRules.find(
          (item) => item.weekday === date.getDay() && item.available,
        );
        if (!rule) return [];
        const duration = court.onlineDurationMinutes[0] ?? 60;
        return Array.from(
          {
            length: Math.max(
              0,
              Math.floor(
                (rule.endsAtMinute - rule.startsAtMinute - duration) /
                  court.onlineSlotMinutes,
              ) + 1,
            ),
          },
          (_, index) => rule.startsAtMinute + index * court.onlineSlotMinutes,
        ).flatMap((minute) => {
          const startsAt = new Date(date);
          startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
          const endsAt = new Date(startsAt.getTime() + duration * 60_000);
          if (
            startsAt <= now ||
            occurrences.some(
              (occurrence) =>
                occurrence.occurrenceCourts.some(
                  (entry) => entry.courtId === court.id,
                ) &&
                occurrence.startsAt < endsAt &&
                occurrence.endsAt > startsAt,
            )
          )
            return [];
          return [
            {
              value: `${court.id}|${startsAt.toISOString()}|${duration}`,
              courtId: court.id,
              courtName: court.name,
              courtColor: court.color,
              startsAt: startsAt.toISOString(),
              durationMinutes: duration,
              label: `${court.name} · ${dateTimeLabel(startsAt)} · ${duration / 60}h`,
            },
          ];
        });
      }),
    )
    .flat();
  const makeupSlots = arena.courts
    .flatMap((court) =>
      Array.from({ length: 14 }, (_, dayOffset) => {
        const date = new Date(now);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + dayOffset);
        const rule = court.weeklyRules.find(
          (item) => item.weekday === date.getDay() && item.available,
        );
        if (!rule) return [];
        const duration = 60;
        return Array.from(
          {
            length: Math.max(
              0,
              Math.floor(
                (rule.endsAtMinute - rule.startsAtMinute - duration) /
                  court.onlineSlotMinutes,
              ) + 1,
            ),
          },
          (_, index) => rule.startsAtMinute + index * court.onlineSlotMinutes,
        ).flatMap((minute) => {
          const startsAt = new Date(date);
          startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
          const endsAt = new Date(startsAt.getTime() + duration * 60_000);
          if (
            startsAt <= now ||
            occurrences.some(
              (occurrence) =>
                occurrence.occurrenceCourts.some(
                  (entry) => entry.courtId === court.id,
                ) &&
                occurrence.startsAt < endsAt &&
                occurrence.endsAt > startsAt,
            )
          )
            return [];
          return [
            {
              value: `${court.id}|${startsAt.toISOString()}|${duration}`,
              label: `${court.name} · ${dateTimeLabel(startsAt)}`,
            },
          ];
        });
      }),
    )
    .flat();
  return {
    arenaSlug,
    leagueCategories,
    selectedLeagueCategoryId: selectedLeagueCompetition?.categoryId ?? null,
    selectedLeaguePairs,
    leagueResults,
    pairs: ownPairs.map((pair) => ({
      id: pair.id,
      categoryId: pair.competition.categoryId,
      name: pair.name,
      categoryName: pair.competition.category.name,
      eventName: pair.competition.category.tournament.name,
      groupName: pair.group?.name ?? "",
      players: pair.players.map((entry) => ({
        id: entry.player.id,
        name: entry.player.name,
      })),
      medicalRequestPending: medicalRequests.some(
        (request) => request.pairId === pair.id,
      ),
      opponents: pair.homeMatches
        // O ciclo mensal organiza a tabela, mas não determina quem pode
        // registrar placar. Todo mandante de um confronto pendente deve ver
        // a ação, inclusive em jogos criados antes de um ciclo ser vinculado.
        .filter((match) => !match.winnerPairId)
        .map((match) => ({
          matchId: match.id,
          pair: match.awayPair,
          block: match.leagueBlock,
        }))
        .filter(
          (
            item,
          ): item is {
            matchId: string;
            block: number | null;
            pair: { id: string; name: string; groupId: string | null };
          } =>
            Boolean(item.pair) &&
            item.pair!.id !== pair.id &&
            (!pair.groupId || item.pair!.groupId === pair.groupId),
        )
        .map((item) => ({
          matchId: item.matchId,
          id: item.pair.id,
          name: item.pair.name,
          block: item.block,
        })),
    })),
    challenges: challenges.map((challenge) => ({
      id: challenge.id,
      categoryId: challenge.categoryMatch.competition.categoryId,
      status: challenge.status,
      opponent: challenge.categoryMatch.awayPair?.name ?? "Dupla visitante",
      proposer: challenge.categoryMatch.homePair?.name ?? "Dupla mandante",
      court: challenge.court.name,
      proposedAt: dateTimeLabel(challenge.startsAt),
      responseDueAt: dateTimeLabel(challenge.responseDueAt),
      block: challenge.categoryMatch.leagueBlock,
      incoming: ownPairs.some((pair) => pair.id === challenge.opponentPairId),
    })),
    leagueNotifications: leagueNotifications.map((notification) => {
      const proposalId = notification.href.match(/#desafio-([^#?]+)/)?.[1];
      const challenge = proposalId
        ? challenges.find((item) => item.id === proposalId)
        : null;
      const href = challenge
        ? `/classificacao/${arenaSlug}?section=leagues&tab=games&leagueTab=games&leagueCategory=${challenge.categoryMatch.competition.categoryId}#desafio-${challenge.id}`
        : notification.href;
      return { ...notification, href };
    }),
    slots,
    replacementPlayers,
    prizes: prizes.map((cycle) => ({
      id: cycle.id,
      eventName: cycle.competition.category.tournament.name,
      categoryName: cycle.competition.category.name,
      description: cycle.prizeDescription,
    })),
    reservations: reservations.map((reservation) => ({
      id: reservation.id,
      title: reservation.title,
      courtName:
        reservation.occurrenceCourts
          .map((entry) => entry.court.name)
          .join(" · ") || "Quadra a definir",
      when: dateTimeLabel(reservation.startsAt),
      status:
        reservation.status === "CONFIRMED"
          ? "Confirmada"
          : reservation.status === "PENDING"
            ? "Aguardando confirmação"
            : "Agendada",
    })),
    lessons:
      student?.attendances.map((attendance) => ({
        id: attendance.lesson.id,
        title: attendance.lesson.title,
        teacherName: attendance.lesson.teacher?.name ?? "",
        when: attendance.lesson.scheduledAt
          ? dateTimeLabel(attendance.lesson.scheduledAt)
          : "Horário a definir",
        status:
          attendance.lesson.status === "CANCELED" ? "Cancelada" : "Agendada",
        checkedIn: Boolean(attendance.checkedInAt),
        makeupRequested: Boolean(attendance.makeupRequestedAt),
      })) ?? [],
    teachers,
    classes: classOccurrences.map((occurrence) => ({
      id: occurrence.id,
      teacherId: occurrence.teacher?.id ?? "",
      teacherName: occurrence.teacher?.name ?? "Professor",
      title: occurrence.title,
      when: dateTimeLabel(occurrence.startsAt),
      status:
        occurrence.status === "PENDING_CONFIRMATION"
          ? "Aguardando confirmação"
          : "Agendada",
    })),
    classGroups: classGroups.map((group) => ({
      id: group.id,
      name: group.name,
      teacherId: group.teacherId,
      teacherName: group.teacher.name,
      schedules: group.schedules.map((schedule) => ({
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        capacity: schedule.capacity,
      })),
      enrolled: group.enrollments.some(
        (enrollment) => enrollment.studentId === student?.id,
      ),
      requestPending: Boolean(group.requests.length),
      available: group.schedules.every(
        (schedule) => group.enrollments.length < schedule.capacity,
      ),
    })),
    student: student
      ? {
          remainingClasses: Math.min(
            student.monthlyBalances[0]?.remainingClasses ??
              student.subscriptions[0]?.classesPerMonth ??
              student.remainingClasses,
            student.subscriptions[0]?.classesPerMonth ??
              student.monthlyBalances[0]?.totalClasses ??
              student.remainingClasses,
          ),
          attendedClasses: student.attendedClasses,
          missedClasses: student.missedClasses,
          active: student.active,
          planName: student.subscriptions[0]?.plan.name ?? "",
          teacherName: student.teacherAssignments[0]?.teacher.name ?? "",
        }
      : null,
    teacherManagement: teacherManagement
      ? {
          plans: teacherManagement.planAssignments.map((assignment) => ({
            id: assignment.plan.id,
            name: assignment.plan.name,
            classesPerMonth: assignment.plan.classesPerMonth,
            monthlyPriceCents: assignment.plan.monthlyPriceCents,
          })),
          students: teacherManagement.studentAssignments.map((assignment) => {
            const initialMonthlyClasses =
              assignment.student.subscriptions[0]?.classesPerMonth ??
              assignment.student.monthlyBalances[0]?.totalClasses ??
              assignment.student.remainingClasses;
            return {
              id: assignment.student.id,
              name: assignment.student.name,
              remainingClasses: Math.min(
                assignment.student.monthlyBalances[0]?.remainingClasses ??
                  initialMonthlyClasses,
                initialMonthlyClasses,
              ),
              initialMonthlyClasses,
              planName:
                assignment.student.subscriptions[0]?.plan.name ??
                "Sem plano ativo",
              classGroup:
                assignment.student.classGroupEnrollments[0]?.classGroup ?? null,
              requestedMakeups: assignment.student.attendances.length,
              pendingMakeups: assignment.student.attendances
                .filter((attendance) => attendance.status === "ABSENT")
                .map((attendance) => attendance.id),
            };
          }),
          makeupSlots,
          agenda: teacherManagement.scheduleOccurrences.map((occurrence) => ({
            id: occurrence.id,
            title: occurrence.title,
            when: dateTimeLabel(occurrence.startsAt),
            status:
              occurrence.status === "PENDING_CONFIRMATION"
                ? "Aguardando confirmação"
                : "Agendada",
          })),
          classGroups: teacherManagement.classGroups.map((group) => ({
            id: group.id,
            name: group.name,
            schedules: group.schedules.map((schedule) => ({
              id: schedule.id,
              weekday: schedule.weekday,
              startTime: schedule.startTime,
              capacity: schedule.capacity,
            })),
            enrolledCount: group.enrollments.length,
            students: group.enrollments.map((enrollment) => ({
              id: enrollment.student.id,
              name: enrollment.student.name,
            })),
          })),
        }
      : null,
  };
}
