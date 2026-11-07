import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export function db() {
  if (!env.DB) throw Error("Database not configured");
  return env.DB;
}
export async function staff() {
  const h = await headers();
  const service = String((env as any).STAFF_SERVICE_TOKEN || "");
  const provided = (h.get("authorization") || "").replace(/^Bearer /, "");
  const integrationMode = String(
    (env as any).INTEGRATION_TEST_MODE || "disabled",
  );
  if (
    integrationMode === "enabled" &&
    service &&
    provided &&
    (await hash(provided)) === (await hash(service))
  )
    return true;
  const user = await getChatGPTUser();
  const allowed = String((env as any).STAFF_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase());
  return !!user && allowed.includes(user.email.toLowerCase());
}
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

export async function actor() {
  return (await getChatGPTUser())?.email || "Authorised integration test";
}
export async function auditStatement(action: string, recordId: string) {
  return db()
    .prepare(
      "INSERT INTO changes (id,actor,action,record_id,created_at) VALUES (?,?,?,?,?)",
    )
    .bind(id(), await actor(), action, recordId, new Date().toISOString());
}
