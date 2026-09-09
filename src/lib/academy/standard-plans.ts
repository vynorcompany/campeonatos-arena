type StandardPlanOption = {
  id: string;
  name: string;
  classesPerMonth: number;
};

function tidy(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeStandardPlanName(name: string, teacherNames: string[]) {
  const planName = tidy(name);
  const matchingTeacherNames = teacherNames
    .map(tidy)
    .filter(Boolean)
    .sort((first, second) => second.length - first.length);

  for (const teacherName of matchingTeacherNames) {
    for (const suffix of [` · ${teacherName}`, ` | ${teacherName}`]) {
      if (planName.toLocaleLowerCase("pt-BR").endsWith(suffix.toLocaleLowerCase("pt-BR"))) {
        return planName.slice(0, -suffix.length).trim();
      }
    }
  }

  return planName;
}

export function uniqueStandardPlanOptions(
  plans: StandardPlanOption[],
  teacherNames: string[],
) {
  const options = new Map<string, StandardPlanOption>();

  for (const plan of plans) {
    const name = normalizeStandardPlanName(plan.name, teacherNames);
    const key = name.toLocaleLowerCase("pt-BR");
    const option = { ...plan, name };
    const current = options.get(key);

    if (!current || plan.name === name) options.set(key, option);
  }

  return [...options.values()].sort((first, second) =>
    first.name.localeCompare(second.name, "pt-BR"),
  );
}
