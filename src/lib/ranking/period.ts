export type RankingPeriodCycle = {
  id: string;
  label: string;
  startedAt: Date;
  endedAt: Date | null;
};

export type RankingPeriodMode =
  | "month"
  | "quarter"
  | "semester"
  | "year"
  | "custom"
  | "cycle";

export type RankingPeriodQuery = {
  period?: string;
  start?: string;
  end?: string;
  cycleId?: string;
};

export type ResolvedRankingPeriod = {
  mode: RankingPeriodMode;
  label: string;
  start: Date;
  endExclusive: Date | null;
  query: Record<string, string>;
  error: string | null;
};

const periodModes = new Set<RankingPeriodMode>([
  "month",
  "quarter",
  "semester",
  "year",
  "custom",
  "cycle",
]);

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function zonedDate(
  year: number,
  month: number,
  day: number,
  timeZone: string,
) {
  const utcGuess = Date.UTC(year, month - 1, day);
  const firstParts = getZonedDateParts(new Date(utcGuess), timeZone);
  const firstOffset = Date.UTC(
    firstParts.year,
    firstParts.month - 1,
    firstParts.day,
    firstParts.hour,
    firstParts.minute,
    firstParts.second,
  ) - utcGuess;
  const firstResult = utcGuess - firstOffset;
  const secondParts = getZonedDateParts(new Date(firstResult), timeZone);
  const secondOffset = Date.UTC(
    secondParts.year,
    secondParts.month - 1,
    secondParts.day,
    secondParts.hour,
    secondParts.minute,
    secondParts.second,
  ) - firstResult;
  return new Date(utcGuess - secondOffset);
}

function parseDateOnly(value: string | undefined, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }
  return zonedDate(year, month, day, timeZone);
}

function formatDateOnly(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function formatRankingDateInput(
  date: Date,
  timeZone = "America/Sao_Paulo",
) {
  return formatDateOnly(date, timeZone);
}

function getMonthKey(date: Date, timeZone: string) {
  return formatDateOnly(date, timeZone).slice(0, 7);
}

function addDays(date: Date, days: number, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  const calendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return zonedDate(
    calendarDate.getUTCFullYear(),
    calendarDate.getUTCMonth() + 1,
    calendarDate.getUTCDate(),
    timeZone,
  );
}

function presetRange(
  mode: Exclude<RankingPeriodMode, "custom" | "cycle">,
  now: Date,
  timeZone: string,
) {
  const nowParts = getZonedDateParts(now, timeZone);
  const year = nowParts.year;
  const month = nowParts.month - 1;
  if (mode === "quarter") {
    const startMonth = Math.floor(month / 3) * 3;
    return [
      zonedDate(year, startMonth + 1, 1, timeZone),
      zonedDate(year, startMonth + 4, 1, timeZone),
    ] as const;
  }
  if (mode === "semester") {
    const startMonth = month < 6 ? 0 : 6;
    const endCalendar = new Date(Date.UTC(year, startMonth + 6, 1));
    return [
      zonedDate(year, startMonth + 1, 1, timeZone),
      zonedDate(
        endCalendar.getUTCFullYear(),
        endCalendar.getUTCMonth() + 1,
        1,
        timeZone,
      ),
    ] as const;
  }
  if (mode === "year") {
    return [
      zonedDate(year, 1, 1, timeZone),
      zonedDate(year + 1, 1, 1, timeZone),
    ] as const;
  }
  const nextMonth = new Date(Date.UTC(year, month + 1, 1));
  return [
    zonedDate(year, month + 1, 1, timeZone),
    zonedDate(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth() + 1,
      1,
      timeZone,
    ),
  ] as const;
}

const presetLabels: Record<Exclude<RankingPeriodMode, "custom" | "cycle">, string> = {
  month: "Mês atual",
  quarter: "Trimestre atual",
  semester: "Semestre atual",
  year: "Ano atual",
};

export function buildVirtualRankingCycle(
  now = new Date(),
  timeZone = "America/Sao_Paulo",
): RankingPeriodCycle {
  const [startedAt, endExclusive] = presetRange("month", now, timeZone);
  return {
    id: `current-${getMonthKey(now, timeZone)}`,
    label: "Ciclo atual",
    startedAt,
    endedAt: new Date(endExclusive.getTime() - 1),
  };
}

export function resolveLegacyRankingPeriod(
  cycles: RankingPeriodCycle[],
  now = new Date(),
  timeZone = "America/Sao_Paulo",
): ResolvedRankingPeriod {
  const currentMonthKey = getMonthKey(now, timeZone);
  const cycle =
    cycles.find(
      (item) => getMonthKey(item.startedAt, timeZone) === currentMonthKey,
    ) ?? buildVirtualRankingCycle(now, timeZone);

  return {
    mode: "cycle",
    label: cycle.label,
    start: cycle.startedAt,
    endExclusive: cycle.endedAt
      ? new Date(cycle.endedAt.getTime() + 1)
      : null,
    query: { period: "cycle", cycleId: cycle.id },
    error: null,
  };
}

export function resolveRankingPeriod(
  query: RankingPeriodQuery,
  cycles: RankingPeriodCycle[],
  now = new Date(),
  timeZone = "America/Sao_Paulo",
): ResolvedRankingPeriod {
  const requestedMode = periodModes.has(query.period as RankingPeriodMode)
    ? (query.period as RankingPeriodMode)
    : query.cycleId
      ? "cycle"
      : "month";

  if (requestedMode === "custom") {
    const start = parseDateOnly(query.start, timeZone);
    const inclusiveEnd = parseDateOnly(query.end, timeZone);
    const fallback = presetRange("month", now, timeZone);
    const normalizedQuery = {
      period: "custom",
      start: query.start ?? "",
      end: query.end ?? "",
    };
    if (!start || !inclusiveEnd) {
      return {
        mode: "custom",
        label: "Período personalizado",
        start: fallback[0],
        endExclusive: fallback[1],
        query: normalizedQuery,
        error: "Informe as datas inicial e final do período.",
      };
    }
    if (start > inclusiveEnd) {
      return {
        mode: "custom",
        label: "Período personalizado",
        start: fallback[0],
        endExclusive: fallback[1],
        query: normalizedQuery,
        error: "A data inicial deve ser anterior ou igual à data final.",
      };
    }
    return {
      mode: "custom",
      label: `${formatDateOnly(start, timeZone)} a ${formatDateOnly(inclusiveEnd, timeZone)}`,
      start,
      endExclusive: addDays(inclusiveEnd, 1, timeZone),
      query: {
        period: "custom",
        start: formatDateOnly(start, timeZone),
        end: formatDateOnly(inclusiveEnd, timeZone),
      },
      error: null,
    };
  }

  if (requestedMode === "cycle") {
    const legacyMonthId = /^(?:current-)?(\d{4}-\d{2})$/.exec(
      query.cycleId ?? "",
    )?.[1] ?? null;
    const cycle =
      cycles.find((item) => item.id === query.cycleId) ??
      cycles.find(
        (item) =>
          legacyMonthId &&
          getMonthKey(item.startedAt, timeZone) === legacyMonthId,
      );
    if (cycle) {
      return {
        mode: "cycle",
        label: cycle.label,
        start: cycle.startedAt,
        endExclusive: cycle.endedAt
          ? new Date(cycle.endedAt.getTime() + 1)
          : null,
        query: { period: "cycle", cycleId: cycle.id },
        error: null,
      };
    }
    const [start, endExclusive] = presetRange("month", now, timeZone);
    return {
      mode: "cycle",
      label: "Ciclo",
      start,
      endExclusive,
      query: { period: "cycle", cycleId: query.cycleId ?? "" },
      error: "Selecione um ciclo válido.",
    };
  }

  const [start, endExclusive] = presetRange(requestedMode, now, timeZone);
  return {
    mode: requestedMode,
    label: presetLabels[requestedMode],
    start,
    endExclusive,
    query: { period: requestedMode },
    error: null,
  };
}
