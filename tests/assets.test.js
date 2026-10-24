import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../assets/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root)));
function header(file) {
  const b = readFileSync(new URL(file, root));
  assert.equal(b.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    type: b[25],
    hash: createHash("sha256").update(b).digest("hex"),
  };
}
test("all 23 runtime PNG atlases have the declared cell grid and retained source artwork", () => {
  assert.equal(manifest.sheets.length, 23);
  for (const sheet of manifest.sheets) {
    const png = header(sheet.runtime);
    assert.equal(png.width, 384, sheet.key);
    assert.equal(png.height, sheet.rows * 96, sheet.key);
    assert.equal(png.type, 6, `${sheet.key} must support alpha`);
    assert.equal(sheet.frames, 4 * sheet.rows);
    const source = header(sheet.source);
    assert.ok(source.width >= 1024 && source.height >= 1024, sheet.key);
  }
});
test("all Saiyan forms have separate original PNGs, and no invented Buu/Krillin forms", () => {
  const counts = { goku: 7, vegeta: 6, gohan: 5, buu: 1, krillin: 1 };
  for (const [id, count] of Object.entries(counts)) {
    const sheets = manifest.sheets.filter((s) => s.key.startsWith(id + "-"));
    assert.equal(sheets.length, count, id);
    assert.equal(
      new Set(sheets.map((s) => header(s.runtime).hash)).size,
      count,
      id,
    );
  }
  assert.equal(manifest.sheets.find((s) => s.key === "enemies").rows, 9);
});
test("legacy base textures stay below 3 MiB and never reference source masters", () => {
  let total = 0;
  for (const sheet of manifest.sheets) {
    assert.ok(sheet.runtime.startsWith("packed/"));
    total += statSync(new URL(sheet.runtime, root)).size;
  }
  assert.ok(total < 3 * 1024 * 1024, `runtime payload ${total}`);
});
