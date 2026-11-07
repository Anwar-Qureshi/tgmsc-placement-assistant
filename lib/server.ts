import {context} from "./context";
export function db(){const d=context().env.DB;if(!d)throw Error("Database not configured");return d;}
export async function staff(){return !!context().user;}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 50000)
    throw Error("Request is too large");
  if (!req.body) throw Error("Request body is required");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 50000) {
        await reader.cancel();
        throw Error("Request is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export const id = () => crypto.randomUUID();
export async function hash(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

export async function actor(){const user=context().user;if(!user)throw Error("Staff identity required");return user.email;}
export async function auditStatement(action: string, recordId: string) {
  return db()
    .prepare(
      "INSERT INTO changes (id,actor,action,record_id,created_at) VALUES (?,?,?,?,?)",
    )
    .bind(id(), await actor(), action, recordId, new Date().toISOString());
}
