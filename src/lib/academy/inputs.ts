export function getFormValues(formData: FormData, name: string) {
  return formData.getAll(name).map(String).filter(Boolean);
}

const classGroupWeekdayAbbreviations = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

export function getClassGroupName(
  schedules: { weekday: number; startTime: string }[],
) {
  const firstSchedule = [...schedules].sort(
    (first, second) =>
      (first.weekday === 0 ? 7 : first.weekday) -
        (second.weekday === 0 ? 7 : second.weekday) ||
      first.startTime.localeCompare(second.startTime),
  )[0];

  if (!firstSchedule) throw new Error("Informe ao menos um horário da turma.");
  return `${classGroupWeekdayAbbreviations[firstSchedule.weekday]} ${firstSchedule.startTime}`;
}

export function parseScheduledAt(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseMoneyToCents(value: string) {
  const cleanValue = value.trim() || "0";
  const normalized = cleanValue.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Valor inválido.");
  }

  return Math.round(amount * 100);
}

