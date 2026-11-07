import {phoneKey,contactKey} from "@/lib/contact";
import { z } from "zod";
import {
  db,
  json,
  body,
  sameOrigin,
  staff,
  id,
  auditStatement,
} from "@/lib/server";
import { staffRecords } from "@/lib/staff-records";
import {
  profileSchema,
  profileIssue,
  rulesSchema,
  problems,
} from "@/lib/validation";
import { csvCell, normalizeSkills, qualificationNames } from "@/lib/matching";
const driveSchema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().trim().min(3).max(150),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        Number.isFinite(Date.parse(v + "T00:00:00Z")) &&
        new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v,
      "Enter a valid calendar date",
    ),
  venue: z.string().trim().min(3).max(250),
  status: z.enum(["draft", "open", "closed"]),
  demo: z.number().int().min(0).max(1).default(0),
  reporting_time: z.string().max(100).default(""),
  deadline: z.union([z.literal(""), z.string().datetime()]).default(""),
  help_contact: z.string().max(200).default(""),
  instructions: z.string().max(2000).default(""),
});
const companySchema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().trim().min(2).max(150),
  description: z.string().max(1000),
  demo: z.number().int().min(0).max(1).default(0),
});
const jobSchema = z.object({
  id: z.string().max(100).optional(),
  driveId: z.string().min(1),
  companyId: z.string().min(1),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(15).max(3000),
  skills: z.array(z.string().trim().min(1).max(60)).max(40),
  qualification: z.number().int().min(-1).max(4),
  experience: z.number().int("Use whole years: 0, 1, 2…").min(0).max(60),
  location: z.string().max(150),
  salary: z.string().max(150),
  status: z.enum(["draft", "open", "closed"]),
  educationRules: rulesSchema.optional(),
});
export async function GET(req: Request) {
  if (!(await staff()))
    return json({ error: "Staff sign-in is required." }, 403);
  try {
    return await staffRecords(req);
  } catch {
    return json({ error: "Records could not be loaded. Please retry." }, 503);
  }
}
export async function POST(req: Request) {
  if (!(await staff()) || !sameOrigin(req))
    return json({ error: "Staff access is required." }, 403);
  try {
    const data = await body(req),
      d = db();
    const statements: any[] = [];
    if (data.type === "drive") {
      const v = driveSchema.parse(data.value);
      if (
        v.status === "open" &&
        v.date < new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
      )
        return json(
          { error: "Choose an upcoming drive date or keep this drive closed." },
          400,
        );
      if (
        v.status === "open" &&
        (!v.reporting_time.trim() || !v.help_contact.trim())
      )
        return json(
          {
            error:
              "Add a reporting time and official help contact before opening registration.",
          },
          400,
        );
      if (
        v.deadline &&
        Date.parse(v.deadline) > Date.parse(v.date + "T23:59:59+05:30")
      )
        return json(
          {
            error: "The registration deadline cannot be after the drive date.",
          },
          400,
        );

      statements.push(
        d
          .prepare(
            "INSERT INTO drives (id,name,date,venue,status,demo,reporting_time,deadline,help_contact,instructions) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,date=excluded.date,venue=excluded.venue,status=excluded.status,demo=excluded.demo,reporting_time=excluded.reporting_time,deadline=excluded.deadline,help_contact=excluded.help_contact,instructions=excluded.instructions",
          )
          .bind(
            (data.value.id = v.id || id()),
            v.name,
            v.date,
            v.venue,
            v.status,
            v.demo,
            v.reporting_time,
            v.deadline,
            v.help_contact,
            v.instructions,
          ),
      );
    } else if (data.type === "company") {
      const v = companySchema.parse(data.value);
      statements.push(
        d
          .prepare(
            "INSERT INTO companies (id,name,description,demo) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,demo=excluded.demo",
          )
          .bind((data.value.id = v.id || id()), v.name, v.description, v.demo),
      );
    } else if (data.type === "job") {
      const v = jobSchema.parse(data.value);
      const old: any = v.id
        ? await d
            .prepare("SELECT drive_id,company_id FROM jobs WHERE id=?")
            .bind(v.id)
            .first()
        : null;
      if (
        old &&
        (old.drive_id !== v.driveId || old.company_id !== v.companyId) &&
        (await d
          .prepare("SELECT id FROM interests WHERE job_id=? LIMIT 1")
          .bind(v.id)
          .first())
      )
        return json(
          {
            error:
              "This role has candidate interests. Create a new role to change its drive or company.",
          },
          409,
        );

      statements.push(
        d
          .prepare(
            "INSERT INTO jobs (id,drive_id,company_id,title,description,skills,qualification,experience,location,salary,status,education_rules) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET drive_id=excluded.drive_id,company_id=excluded.company_id,title=excluded.title,description=excluded.description,skills=excluded.skills,qualification=excluded.qualification,experience=excluded.experience,location=excluded.location,salary=excluded.salary,status=excluded.status,education_rules=excluded.education_rules",
          )
          .bind(
            (data.value.id = v.id || id()),
            v.driveId,
            v.companyId,
            v.title,
            v.description,
            JSON.stringify(normalizeSkills(v.skills)),
            v.qualification,
            v.experience,
            v.location,
            v.salary,
            v.status,
            JSON.stringify(v.educationRules || {}),
          ),
      );
    } else if (data.type === "profile") {
      const v = profileSchema
        .extend({
          id: z.string().min(1),
          jobIds: z.array(z.string()).max(20).optional(),
        })
        .parse(data.value);
      const issue = profileIssue(v);
      if (issue) return json({ error: issue }, 400);
      const r: any = await d
        .prepare("SELECT candidate_id,drive_id FROM registrations WHERE id=?")
        .bind(v.id)
        .first();
      if (!r) return json({ error: "Registration was not found." }, 404);
      const { hash } = await import("@/lib/server");
      const profileStatements = [
        d
          .prepare(
            "UPDATE candidates SET name=?,email=?,phone=?,qualification=?,experience=?,skills=?,summary=?,education=?,phone_key=? WHERE id=?",
          )
          .bind(
            v.name,
            v.email.toLowerCase(),
            v.phone,
            v.qualification,
            v.experience,
            JSON.stringify(normalizeSkills(v.skills)),
            v.summary,
            JSON.stringify(v.education),
            phoneKey(v.phone),
            r.candidate_id,
          ),
        d
          .prepare(
            "UPDATE registrations SET dedupe=?,request_id=NULL WHERE id=?",
          )
          .bind(
            await hash(contactKey(r.drive_id,v.name,v.email,v.phone)),
            v.id,
          ),
      ];
      if (v.jobIds) {
        const valid = await d
          .prepare("SELECT id FROM jobs WHERE drive_id=?")
          .bind(r.drive_id)
          .all();
        if (
          v.jobIds.some((j) => !valid.results.some((row: any) => row.id === j))
        )
          return json(
            { error: "Choose roles from this registration’s drive." },
            400,
          );
        profileStatements.push(
          d.prepare("DELETE FROM interests WHERE registration_id=?").bind(v.id),
          ...[...new Set(v.jobIds)].map((j) =>
            d
              .prepare(
                "INSERT INTO interests (id,registration_id,job_id) VALUES (?,?,?)",
              )
              .bind(id(), v.id, j),
          ),
        );
      }
      statements.push(...profileStatements);
    } else if (data.type === "status") {
      const v = z
        .object({
          id: z.string(),
          status: z.enum([
            "registered",
            "attended",
            "interviewed",
            "follow-up",
            "withdrawn",
          ]),
        })
        .parse(data.value);
      if(!await d.prepare('SELECT id FROM registrations WHERE id=?').bind(v.id).first())return json({error:'Registration not found.'},404);
      statements.push(
        d
          .prepare("UPDATE registrations SET status=? WHERE id=?")
          .bind(v.status, v.id),
      );
    } else if (data.type === "deleteRegistration") {
      const v = z
        .object({ id: z.string(), confirmation: z.string() })
        .parse(data.value);
      if (v.confirmation !== v.id.slice(0, 8).toUpperCase())
        return json({ error: "Enter the reference to confirm removal." }, 400);
      const r: any = await d
        .prepare("SELECT candidate_id FROM registrations WHERE id=?")
        .bind(v.id)
        .first();
      if (!r) return json({ error: "Registration not found." }, 404);
      statements.push(
        ...[
          d.prepare("DELETE FROM interests WHERE registration_id=?").bind(v.id),
          d.prepare("DELETE FROM registrations WHERE id=?").bind(v.id),
          d
            .prepare(
              "DELETE FROM candidates WHERE id=? AND NOT EXISTS (SELECT 1 FROM registrations WHERE candidate_id=?)",
            )
            .bind(r.candidate_id, r.candidate_id),
        ],
      );
    } else if (data.type === "cleanupPreview") {
      const rows = await d
        .prepare("SELECT id,name FROM drives WHERE demo=1")
        .all();
      const count: any = await d
        .prepare(
          "SELECT COUNT(*) AS count FROM registrations r JOIN drives d ON r.drive_id=d.id WHERE d.demo=1",
        )
        .first();
      return json({ drives: rows.results, registrations: count.count });
    } else if (data.type === "cleanupDemo") {
      if (data.confirmation !== "REMOVE PRACTICE DATA")
        return json({ error: "Confirm removal of practice data." }, 400);
      const candidates = await d
        .prepare(
          "SELECT c.id FROM candidates c WHERE EXISTS (SELECT 1 FROM registrations r JOIN drives d ON r.drive_id=d.id WHERE r.candidate_id=c.id AND d.demo=1) AND NOT EXISTS (SELECT 1 FROM registrations r JOIN drives d ON r.drive_id=d.id WHERE r.candidate_id=c.id AND d.demo=0)",
        )
        .all();
      statements.push(
        ...[
          d.prepare("DELETE FROM changes WHERE actor='Authorised integration test'"),
          d.prepare(
            "DELETE FROM interests WHERE registration_id IN (SELECT r.id FROM registrations r JOIN drives d ON r.drive_id=d.id WHERE d.demo=1) OR job_id IN (SELECT j.id FROM jobs j JOIN drives d ON j.drive_id=d.id WHERE d.demo=1)",
          ),
          d.prepare(
            "DELETE FROM registrations WHERE drive_id IN (SELECT id FROM drives WHERE demo=1)",
          ),
          ...candidates.results.map((c: any) =>
            d
              .prepare(
                "DELETE FROM candidates WHERE id=? AND NOT EXISTS (SELECT 1 FROM registrations WHERE candidate_id=?)",
              )
              .bind(c.id, c.id),
          ),
          d.prepare(
            "DELETE FROM jobs WHERE drive_id IN (SELECT id FROM drives WHERE demo=1)",
          ),
          d.prepare("DELETE FROM drives WHERE demo=1"),
          d.prepare(
            "DELETE FROM companies WHERE demo=1 AND NOT EXISTS (SELECT 1 FROM jobs WHERE company_id=companies.id)",
          ),
        ],
      );
    } else return json({ error: "Unknown operation." }, 400);
    await d.batch([
      ...statements,
      await auditStatement(data.type, data.value?.id || "practice-cleanup"),
    ]);
    return json({ ok: true });
  } catch (e) {
    return json({ error: problems(e) }, 400);
  }
}
