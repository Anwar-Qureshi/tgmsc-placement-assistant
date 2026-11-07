import {
  educationChecks,
  type Education,
  type EducationRules,
} from "./education.ts";
export const qualificationNames = [
  "Class 10",
  "Class 12 / Intermediate",
  "Diploma",
  "Graduate",
  "Postgraduate",
];
export type Profile = {
  name: string;
  email: string;
  phone: string;
  qualification: number | null;
  experience: number | null;
  skills: string[];
  summary: string;
  education?: Education;
};
export type Job = {
  id: string;
  driveId: string;
  companyId: string;
  title: string;
  description: string;
  skills: string[];
  qualification: number;
  experience: number;
  location: string;
  salary: string;
  status: string;
  company?: string;
  educationRules?: EducationRules;
};
export const skillList = [
  "customer service",
  "communication",
  "english",
  "telugu",
  "hindi",
  "sales",
  "retail",
  "cash handling",
  "data entry",
  "excel",
  "accounting",
  "tally",
  "recruitment",
  "patient support",
  "pharmacy",
  "inventory",
  "driving",
  "electrical",
  "mechanical",
  "python",
  "javascript",
  "sql",
  "machine learning",
  "web development",
];
export function normalizeSkills(raw: string | string[]) {
  return [
    ...new Set(
      (Array.isArray(raw) ? raw : raw.split(/[,;\n]/))
        .map(
          (s) =>
            ({
              "ms excel": "excel",
              "microsoft excel": "excel",
              "customer support": "customer service",
              js: "javascript",
            })[s.trim().toLowerCase()] || s.trim().toLowerCase(),
        )
        .filter(Boolean),
    ),
  ].slice(0, 40);
}
export function requirements(profile: Profile, job: Job) {
  const checks = [
    ...educationChecks(
      profile.qualification,
      profile.education,
      job.qualification,
      job.educationRules,
    ),
    {
      name: "Experience",
      state:
        profile.experience == null
          ? "unknown"
          : profile.experience >= job.experience
            ? "met"
            : "gap",
      detail: `Minimum: ${job.experience} year(s)`,
    },
  ];
  const set = new Set(normalizeSkills(profile.skills));
  const matched = job.skills.filter((s) => set.has(s.toLowerCase()));
  const missing = job.skills.filter((s) => !set.has(s.toLowerCase()));
  return {
    checks,
    matched,
    missing,
    status: checks.some((c) => c.state === "gap")
      ? "Check requirements"
      : checks.some((c) => c.state === "unknown")
        ? "Details needed"
        : "Entered requirements met",
  };
}
const tokens = (s: string) =>
  new Set(s.toLowerCase().match(/[a-z][a-z+#.]{1,}/g) || []);
export function keywordSimilarity(a: string, b: string) {
  const x = tokens(a),
    y = tokens(b);
  const n = [...x].filter((t) => y.has(t)).length;
  return x.size && y.size ? n / Math.sqrt(x.size * y.size) : 0;
}
export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return x && y ? Math.max(-1, Math.min(1, dot / Math.sqrt(x * y))) : 0;
}
export function profileText(p: Profile) {
  let summary = p.summary;
  for (const value of [p.name, p.email, p.phone])
    if (value.trim()) summary = summary.split(value).join(" ");
  summary = summary
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/(?:\+91[\s-]?)?[6-9](?:[\s-]?\d){9}\b/g, " ");
  return `${p.skills.join(", ")}. ${p.education?.degree || ""}. ${summary}`.slice(
    0,
    5000,
  );
}
export function jobText(j: Job) {
  return `${j.title}. Skills: ${j.skills.join(", ")}. ${j.description}`.slice(
    0,
    3000,
  );
}
export function rankJobs(
  p: Profile,
  jobs: Job[],
  scores?: Record<string, number>,
) {
  return jobs
    .filter((j) => j.status === "open")
    .map((j) => ({
      job: j,
      ...requirements(p, j),
      relevance:
        scores?.[j.id] ?? keywordSimilarity(profileText(p), jobText(j)),
    }))
    .sort(
      (a, b) =>
        b.relevance - a.relevance || a.job.title.localeCompare(b.job.title),
    );
}
export function extractDraft(text: string) {
  const first =
    text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((s) => s.length > 2 && !/resume|curriculum|profile/i.test(s)) || "";
  return {
    name: first.length < 65 && !/@|\d/.test(first) ? first : "",
    email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "",
    phone: text.match(/(?:\+91[\s-]?)?[6-9](?:[\s-]?\d){9}\b/)?.[0] || "",
    skills: skillList.filter((s) =>
      new RegExp(
        "(?:^|[^a-z])" +
          s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "(?:$|[^a-z])",
        "i",
      ).test(text),
    ),
    summary: text.slice(0, 4000),
    qualification: null,
    experience: null,
  };
}
export function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
