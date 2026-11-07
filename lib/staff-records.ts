import { db, json, actor } from "./server";
import { csvCell, qualificationNames } from "./matching";
import { educationLabel } from "./education";
import { recordQuery,exportPageQuery } from "./records";
const join =
  " FROM registrations r JOIN candidates c ON r.candidate_id=c.id JOIN drives d ON r.drive_id=d.id";
const select = `SELECT r.id,r.drive_id,r.candidate_id,r.status,r.created_at,c.name,c.email,c.phone,c.qualification,c.experience,c.skills,c.summary,c.education,d.name AS drive_name,(SELECT COUNT(*) FROM candidates cp JOIN registrations rp ON rp.candidate_id=cp.id WHERE cp.phone_key=c.phone_key AND c.phone_key<>'' AND cp.id<>c.id AND rp.drive_id=r.drive_id) AS shared_contact,(SELECT group_concat(j.title||' — '||co.name,'; ') FROM interests i JOIN jobs j ON i.job_id=j.id JOIN companies co ON j.company_id=co.id WHERE i.registration_id=r.id) AS choices`;
export async function staffRecords(req: Request) {
  const d = db(),
    params = new URL(req.url).searchParams,
    q = recordQuery(params);
  if (params.get("export") === "csv") {
    const fields = [
      "reference",
      "drive_name",
      "name",
      "email",
      "phone",
      "qualification",
      "education",
      "experience",
      "skills",
      "choices",
      "status",
      "created_at",
    ];
    const snapshot = new Date().toISOString();
    let cursorTime = "",
      cursorId = "",
      first = true;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          if (first) {
            controller.enqueue(
              encoder.encode("\uFEFF" + fields.map(csvCell).join(",") + "\r\n"),
            );
            first = false;
          }
          const exportQuery=exportPageQuery(params,snapshot,cursorTime?{time:cursorTime,id:cursorId}:undefined);
          const rows = await d
            .prepare(
              select + join + exportQuery.where + ' ORDER BY r.created_at DESC,r.id DESC LIMIT 1000'
            ).bind(...exportQuery.values)
            .all();
          const last: any = rows.results.at(-1);
          if (last) {
            cursorTime = last.created_at;
            cursorId = last.id;
          }
          const text = rows.results
            .map((r: any) =>
              fields
                .map((f) =>
                  csvCell(
                    f === "reference"
                      ? r.id.slice(0, 8).toUpperCase()
                      : f === "qualification"
                        ? qualificationNames[r.qualification] || "Not provided"
                        : f === "education"
                          ? educationLabel(JSON.parse(r.education || "{}"))
                          : f === "skills"
                            ? JSON.parse(r.skills).join("; ")
                            : r[f],
                  ),
                )
                .join(","),
            )
            .join("\r\n");
          if (text) controller.enqueue(encoder.encode(text + "\r\n"));
          if (rows.results.length < 1000) controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="placement-registrations.csv"',
        "Cache-Control": "no-store",
      },
    });
  }
  const [count,rows, drives, companies, jobs, changes] = await d.batch([
    d.prepare("SELECT COUNT(*) AS count" + join + q.where).bind(...q.values),
    d.prepare(select+join+q.where+" ORDER BY r.created_at DESC,r.id DESC LIMIT ? OFFSET ?").bind(...q.values,q.limit,q.offset),
    d.prepare("SELECT * FROM drives ORDER BY date DESC"),
    d.prepare("SELECT * FROM companies ORDER BY name"),
    d.prepare("SELECT * FROM jobs"),
    d.prepare("SELECT * FROM changes ORDER BY created_at DESC LIMIT 30")
  ]);
  const ids = rows.results.map((r: any) => r.id);
  let interests: any[] = [];
  if (ids.length)
    interests = (
      await d
        .prepare(
          "SELECT registration_id,job_id FROM interests WHERE registration_id IN (" +
            ids.map(() => "?").join(",") +
            ")",
        )
        .bind(...ids)
        .all()
    ).results;
  return json({
    records: rows.results.map((r: any) => ({
      ...r,
      education: JSON.parse(r.education || "{}"),
      jobIds: interests
        .filter((i) => i.registration_id === r.id)
        .map((i) => i.job_id),
    })),
    total: (count.results[0] as any).count,
    page: q.page,
    pageSize: q.limit,
    user: await actor(),
    drives: drives.results,
    companies: companies.results,
    jobs: jobs.results.map((j: any) => ({
      ...j,
      driveId: j.drive_id,
      companyId: j.company_id,
      educationRules: JSON.parse(j.education_rules || "{}"),
      skills: JSON.parse(j.skills),
    })),
    changes: changes.results,
  });
}
