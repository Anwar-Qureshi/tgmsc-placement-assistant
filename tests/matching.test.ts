import test from "node:test";
import assert from "node:assert/strict";
import {
  rankJobs,
  requirements,
  extractDraft,
  cosine,
  csvCell,
  normalizeSkills,
} from "../lib/matching.ts";
import { demoProfile, demoJobs } from "./fixtures/catalog.ts";
const jobs = demoJobs as any;
test("IT candidate sees all non-IT roles, not automatic rejection", () => {
  const r = rankJobs(demoProfile, jobs);
  assert.equal(r.length, 4);
  assert.ok(r.find((x) => x.job.id === "demo-support"));
  assert.equal(
    r.find((x) => x.job.id === "demo-accounts")?.status,
    "Check requirements",
  );
});
test("missing fields stay unknown and do not silently meet eligibility", () => {
  const r = requirements(
    { ...demoProfile, qualification: null, experience: null },
    jobs[0],
  );
  assert.equal(r.status, "Details needed");
  assert.equal(r.checks[0].state, "unknown");
});
test("higher qualification and fresher rule, no qualification guessing", () => {
  assert.equal(
    requirements(demoProfile, jobs[0]).status,
    "Entered requirements met",
  );
  const p = extractDraft(
    "Aarif Example\naarif@example.com\nPython and SQL skills\nB.E. 2027",
  );
  assert.equal(p.qualification, null);
  assert.equal(p.experience, null);
  assert.ok(p.skills.includes("python"));
});
test("closed jobs excluded; keyword ties deterministic", () => {
  assert.equal(
    rankJobs(demoProfile, [{ ...jobs[0], status: "closed" }]).length,
    0,
  );
  assert.deepEqual(
    rankJobs(demoProfile, jobs).map((x) => x.job.id),
    rankJobs(demoProfile, [...jobs].reverse()).map((x) => x.job.id),
  );
});
test("cosine bounds and zero vectors", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([0, 0], [1, 1]), 0);
  assert.equal(cosine([1], [1, 2]), 0);
});
test("CSV formula escaping and quoted commas", () => {
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell(' name,"x"'), '" name,""x"""');
  assert.ok(csvCell("  +cmd").startsWith("\"'"));
});
test("skills normalization and exact structured matching", () => {
  assert.deepEqual(normalizeSkills(["Python", "python", " SQL "]), [
    "python",
    "sql",
  ]);
  assert.deepEqual(requirements(demoProfile, jobs[3]).matched, [
    "python",
    "sql",
  ]);
});
