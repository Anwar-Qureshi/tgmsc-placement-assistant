export type Education = {
  degree?: string;
  diploma?: string;
  status?: "completed" | "pursuing";
  year?: number | null;
};
export type EducationRules = {
  qualifications?: number[];
  pursuing?: boolean | null;
  batchMode?: "any" | "years" | "through";
  years?: number[];
  through?: number | null;
  degreeNote?: string;
};
export function educationChecks(
  qualification: number | null,
  education: Education = {},
  minimum: number,
  rules: EducationRules = {},
) {
  const accepted =
    rules.qualifications ??
    (minimum === 2
      ? [2]
      : minimum < 0
        ? [0, 1, 2, 3, 4]
        : Array.from({ length: 5 - minimum }, (_, i) => minimum + i));
  const ongoing = education.status === "pursuing",
    completedMet = qualification != null && accepted.includes(qualification),
    pursuingMet = ongoing && rules.pursuing === true && accepted.includes(3);
  const checks = [
    {
      name: "Education",
      state:
        minimum < 0
          ? "met"
          : qualification == null && !pursuingMet
            ? "unknown"
            : completedMet || pursuingMet
              ? "met"
              : "gap",
      detail:
        minimum < 0
          ? "No formal qualification requirement"
          : `Accepted: ${accepted.map((i) => ["Class 10", "Class 12", "Diploma", "Graduate", "Postgraduate"][i]).join(", ")}`,
    },
  ];
  if (ongoing && (rules.pursuing != null || (!completedMet && minimum >= 0)))
    checks.push({
      name: "Study status",
      state:
        rules.pursuing == null ? "unknown" : rules.pursuing ? "met" : "gap",
      detail:
        rules.pursuing == null
          ? "Ask staff whether pursuing students are accepted"
          : rules.pursuing
            ? "Pursuing undergraduates accepted"
            : "Completed qualification required",
    });
  if (rules.batchMode && rules.batchMode !== "any")
    checks.push({
      name: "Graduation year",
      state:
        education.year == null
          ? "unknown"
          : (
                rules.batchMode === "years"
                  ? (rules.years || []).includes(education.year)
                  : rules.through != null && education.year <= rules.through
              )
            ? "met"
            : "gap",
      detail:
        rules.batchMode === "years"
          ? `Accepted years: ${(rules.years || []).join(", ")}`
          : `${rules.through} and earlier`,
    });
  if (rules.degreeNote?.trim())
    checks.push({
      name: "Degree or specialisation",
      state: "unknown",
      detail: rules.degreeNote + " — confirm with organiser",
    });
  return checks;
}
export function educationLabel(e: Education = {}) {
  return [
    e.diploma,
    e.degree,
    e.status === "pursuing"
      ? "Currently pursuing"
      : e.status === "completed"
        ? "Completed"
        : "",
    e.year ? `${e.status === "pursuing" ? "Expected " : ""}${e.year}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Drop inactive batch fields, including stale invalid browser drafts. */
export function activeEducationRules(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const rules = { ...(value as Record<string, unknown>) };
  const mode = rules.batchMode ?? "any";
  if (mode !== "years") delete rules.years;
  if (mode !== "through") delete rules.through;
  return rules;
}
export function batchModeChange(rules: EducationRules, mode: EducationRules["batchMode"]): EducationRules {
  return activeEducationRules({...rules,batchMode:mode}) as EducationRules;
}
