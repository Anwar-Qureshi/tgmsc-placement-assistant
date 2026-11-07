import { z } from "zod";
import { activeEducationRules } from "./education.ts";
export const educationSchema = z
  .object({
    degree: z.string().trim().max(150).optional(),
    diploma: z.string().trim().max(150).optional(),
    status: z.enum(["completed", "pursuing"]).optional(),
    year: z.number().int().min(1950).max(2100).nullable().optional(),
  })
  .default({});
export const rulesSchema = z.preprocess(activeEducationRules, z
  .object({
    qualifications: z
      .array(z.number().int().min(0).max(4))
      .min(1)
      .max(5)
      .optional(),
    pursuing: z.boolean().nullable().optional(),
    batchMode: z.enum(["any", "years", "through"]).default("any"),
    years: z.array(z.number().int().min(1950).max(2100)).max(100).optional(),
    through: z.number().int().min(1950).max(2100).nullable().optional(),
    degreeNote: z.string().max(500).optional(),
  })
  .superRefine((v, c) => {
    if (v.batchMode === "years" && !v.years?.length)
      c.addIssue({
        code: "custom",
        message: "Enter accepted graduation years.",
      });
    if (v.batchMode === "through" && !v.through)
      c.addIssue({
        code: "custom",
        message: "Enter the latest accepted graduation year.",
      });
  }));
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter a full name.").max(100),
  email: z.union([
    z.literal(""),
    z.string().trim().email("Check the email address.").max(150),
  ]),
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{8,20}$/, "Check the phone number.")
    .refine(
      (v) =>
        v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15,
      "Check the phone number.",
    ),
  qualification: z.number().int().min(0).max(4).nullable(),
  experience: z
    .number()
    .int("Use whole years: 0, 1, 2…")
    .min(0)
    .max(60)
    .nullable(),
  skills: z.array(z.string().trim().max(60)).max(40),
  summary: z.string().max(5000),
  education: educationSchema,
});
export function profileIssue(p: z.infer<typeof profileSchema>) {
  const year = new Date().getUTCFullYear();
  if (p.qualification === 2 && !p.education.diploma?.trim())
    return "Enter your diploma course or branch.";
  if (
    p.qualification === 3 &&
    (!p.education.degree?.trim() ||
      !p.education.year ||
      p.education.status !== "completed")
  )
    return "Enter your completed degree and graduation year.";
  if (
    p.education.status === "pursuing" &&
    (!p.education.degree?.trim() ||
      !p.education.year ||
      p.education.year < year)
  )
    return "Enter your degree and current or future expected graduation year.";
  if (
    p.education.status === "completed" &&
    p.education.year &&
    p.education.year > year
  )
    return "A completed graduation year cannot be in the future.";
  if (
    p.education.status === "pursuing" &&
    p.qualification != null &&
    p.qualification >= 3
  )
    return "Select the highest completed qualification separately from the degree you are pursuing.";
  return "";
}
export const problems = (e: unknown) => {
  if (!(e instanceof z.ZodError)) return "The change could not be saved. Please try again.";
  return [...new Set(e.issues.map((issue) => {
    const field=issue.path.join(".");
    if (field.includes("years")) return "Enter valid four-digit graduation years, separated by commas, such as 2026, 2027.";
    if (field.includes("through")) return "Enter the latest accepted graduation year, such as 2026.";
    if (field.includes("qualifications")) return "Select at least one accepted qualification, or choose no formal qualification requirement.";
    if (issue.path.at(-1) === "experience" && issue.code === "invalid_type") return "Enter whole years of experience, such as 0, 1 or 2.";
    return issue.message;
  }))].join(" ");
};
