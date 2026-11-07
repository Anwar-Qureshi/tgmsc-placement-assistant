import {phoneKey,contactKey} from "@/lib/contact";
import { z } from "zod";
import { db, json, body, sameOrigin, id, hash } from "@/lib/server";
import { normalizeSkills } from "@/lib/matching";
import { profileSchema, profileIssue, problems } from "@/lib/validation";
const schema = profileSchema.extend({
  driveId: z.string().min(1).max(100),
  consent: z.literal(true),
  jobIds: z.array(z.string().max(100)).max(20),
  requestId: z
    .string()
    .regex(/^[a-f0-9]{48}$/)
    .optional(),
});
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "This request could not be accepted." }, 403);
  try {
    const data = schema.parse(await body(req));
    const issue = profileIssue(data);
    if (issue) return json({ error: issue }, 400);
    const d = db();
    const receiptKey = data.requestId
      ? await hash(
          data.requestId + JSON.stringify({ ...data, requestId: undefined }),
        )
      : null;
    if (receiptKey) {
      const saved: any = await d
        .prepare("SELECT id FROM registrations WHERE request_id=?")
        .bind(receiptKey)
        .first();
      if (saved)
        return json(
          {
            reference: saved.id.slice(0, 8).toUpperCase(),
            registrationId: saved.id,
            recovered: true,
          },
          200,
        );
    }
    const ip = req.headers.get("cf-connecting-ip");
    if (ip) {
      const key =
        new Date().toISOString().slice(0, 13) + "-" + (await hash(ip));
      await d
        .prepare("DELETE FROM submission_limits WHERE key<?")
        .bind(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 13))
        .run();
      const limit: any = await d
        .prepare(
          "INSERT INTO submission_limits (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<1001 RETURNING count",
        )
        .bind(key)
        .first();
      if (!limit || limit.count > 1000)
        return json(
          {
            error:
              "Many registrations have been submitted from this connection. Please wait or ask placement staff for help.",
          },
          429,
        );
    }
    const drive: any = await d
      .prepare(
        "SELECT id,date,deadline,demo,reporting_time,help_contact FROM drives WHERE id=? AND status='open'",
      )
      .bind(data.driveId)
      .first();
    if (
      !drive ||
      drive.demo ||
      !drive.reporting_time ||
      !drive.help_contact ||
      drive.date <
        new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10) ||
      (drive.deadline && Date.now() > Date.parse(drive.deadline))
    )
      return json(
        {
          error:
            "Registration for this drive is closed. Your details remain on screen; contact the organiser or choose another drive.",
        },
        409,
      );
    const available = await d
      .prepare(
        "SELECT j.id FROM jobs j JOIN companies c ON j.company_id=c.id WHERE j.drive_id=? AND j.status='open' AND c.demo=0",
      )
      .bind(data.driveId)
      .all();
    const valid = new Set(available.results.map((r: any) => r.id));
    if (data.jobIds.some((j) => !valid.has(j)))
      return json(
        {
          error:
            "One of your selected roles has closed. The list can be updated without clearing your profile.",
          refreshRoles: true,
        },
        409,
      );
    const phone=phoneKey(data.phone);
    const dedupe=await hash(contactKey(data.driveId,data.name,data.email,data.phone));
    if(!data.email){const legacy:any=await d.prepare('SELECT c.name FROM registrations r JOIN candidates c ON r.candidate_id=c.id WHERE r.dedupe=?').bind(await hash(data.driveId+':phone:'+phone)).first();if(legacy&&legacy.name.trim().toLowerCase().replace(/\s+/g,' ')===data.name.trim().toLowerCase().replace(/\s+/g,' '))return json({error:'These details are already registered. Ask placement staff to update the existing registration.'},409);}
    if (
      await d
        .prepare("SELECT id FROM registrations WHERE dedupe=?")
        .bind(dedupe)
        .first()
    )
      return json(
        {
          error:
            "These contact details are already registered for this drive. Ask placement staff to update the existing registration.",
        },
        409,
      );
    const candidate = id(),
      registration = id(),
      time = new Date().toISOString();
    await d.batch([
      d
        .prepare(
          "INSERT INTO candidates (id,name,email,phone,qualification,experience,skills,summary,education,created_at,phone_key) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          candidate,
          data.name,
          data.email.toLowerCase(),
          data.phone,
          data.qualification,
          data.experience,
          JSON.stringify(normalizeSkills(data.skills)),
          data.summary,
          JSON.stringify(data.education),
          time,
          phone,
        ),
      d
        .prepare(
          "INSERT INTO registrations (id,drive_id,candidate_id,receipt_hash,dedupe,status,created_at,request_id) VALUES (?,?,?,?,?,'registered',?,?)",
        )
        .bind(
          registration,
          data.driveId,
          candidate,
          await hash(id()),
          dedupe,
          time,
          receiptKey,
        ),
      ...[...new Set(data.jobIds)].map((job) =>
        d
          .prepare(
            "INSERT INTO interests (id,registration_id,job_id) VALUES (?,?,?)",
          )
          .bind(id(), registration, job),
      ),
    ]);
    return json(
      {
        registrationId: registration,
        reference: registration.slice(0, 8).toUpperCase(),
      },
      201,
    );
  } catch (e) {
    return json(
      {
        error:
          e instanceof z.ZodError
            ? problems(e)
            : "We could not confirm the submission. Your details are kept. Try Submit again to recover a saved registration, or contact staff.",
      },
      400,
    );
  }
}
