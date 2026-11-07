import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
test("pinned model assets match the recorded revision and hashes", async () => {
  const m = JSON.parse(
    await readFile(new URL("docs/MODEL_MANIFEST.json", root), "utf8"),
  );
  assert.equal(m.revision, "751bff37182d3f1213fa05d7196b954e230abad9");
  for (const item of m.files) {
    const bytes = await readFile(
      new URL("public/models/Xenova/all-MiniLM-L6-v2/" + item.file, root),
    );
    assert.equal(bytes.length, item.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
  }
});
test("PDF worker and WASM runtime assets match recorded hashes", async () => {
  const m = JSON.parse(
    await readFile(new URL("docs/RUNTIME_MANIFEST.json", root), "utf8"),
  );
  for (const item of m.files) {
    const bytes = await readFile(new URL(item.file, root));
    assert.equal(bytes.length, item.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
  }
});
