import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resumeText } from "../lib/resume.ts";
import { extractDraft } from "../lib/matching.ts";
test("TXT extraction returns fixture and leaves qualifications unconfirmed", async () => {
  const data = await readFile(
    new URL("./fixtures/accounts.txt", import.meta.url),
  );
  const text = await resumeText(new File([data], "accounts.txt"));
  const p = extractDraft(text);
  assert.equal(p.name, "Sana Example");
  assert.equal(p.email, "sana@example.com");
  assert.ok(p.skills.includes("tally"));
  assert.equal(p.qualification, null);
  assert.equal(p.experience, null);
});
test("DOCX raw extraction returns fictional candidate", async () => {
  const data = await readFile(
    new URL("./fixtures/accounts.docx", import.meta.url),
  );
  const text = await resumeText(new File([data], "accounts.docx"));
  assert.ok(text.includes("Sana Example"));
  assert.ok(text.includes("bookkeeping"));
});
test("unsupported file fails with manual entry guidance", async () => {
  await assert.rejects(
    resumeText(new File(["image"], "resume.jpg")),
    /PDF, DOCX or TXT/,
  );
});
test("file size limit checked before parsing", async () => {
  await assert.rejects(
    resumeText(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf")),
    /5 MB/,
  );
});
test("blank TXT does not pretend to extract a profile", async () => {
  await assert.rejects(
    resumeText(new File(["   "], "blank.txt")),
    /Very little text/,
  );
});
test("corrupted DOCX does not return invented data", async () => {
  await assert.rejects(
    resumeText(new File(["not a valid archive"], "bad.docx")),
  );
});
