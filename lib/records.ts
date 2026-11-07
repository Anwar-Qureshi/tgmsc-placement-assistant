export function recordQuery(params: URLSearchParams) {
  const where: string[] = [];
  const values: (string | number)[] = [];
  for (const [key, col] of [
    ["drive", "r.drive_id"],
    ["status", "r.status"],
  ] as const) {
    const value = params.get(key) || "";
    if (value) {
      where.push(col + "=?");
      values.push(value.slice(0, 100));
    }
  }
  const q = (params.get("q") || "").trim().toLowerCase().slice(0, 150);
  if (q) {
    where.push(
      "(lower(c.name) LIKE ? ESCAPE '\\' OR lower(c.email) LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR lower(r.id) LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM interests si JOIN jobs sj ON si.job_id=sj.id JOIN companies sc ON sj.company_id=sc.id WHERE si.registration_id=r.id AND lower(sj.title||' '||sc.name) LIKE ? ESCAPE '\\'))",
    );
    const pattern = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
    values.push(pattern, pattern, pattern, pattern, pattern);
  }
  for (const [key, expr] of [
    ["job", "fj.id"],
    ["company", "fj.company_id"],
  ] as const) {
    const value = params.get(key);
    if (value) {
      where.push(
        "EXISTS (SELECT 1 FROM interests fi JOIN jobs fj ON fi.job_id=fj.id WHERE fi.registration_id=r.id AND " +
          expr +
          "=?)",
      );
      values.push(value.slice(0, 100));
    }
  }
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(params.get("page") || "1") || 1),
  );
  return {
    where: where.length ? " WHERE " + where.join(" AND ") : "",
    values,
    page,
    limit: 50,
    offset: (page - 1) * 50,
  };
}
export function exportPageQuery(params:URLSearchParams,snapshot:string,cursor?:{time:string;id:string}){const q=recordQuery(params);return {where:q.where+(q.where?' AND ':' WHERE ')+"r.created_at<=?"+(cursor?' AND (r.created_at<? OR (r.created_at=? AND r.id<?))':''),values:cursor?[...q.values,snapshot,cursor.time,cursor.time,cursor.id]:[...q.values,snapshot],limit:1000,offset:0};}
