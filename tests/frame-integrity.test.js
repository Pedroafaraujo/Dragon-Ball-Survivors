import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { decodeRGBA, inspectFrame } from "../tools/png-audit.mjs";
import { FRAME_DATA } from "../src/frame-data.js";
import { Animator } from "../src/animation.js";
const root = new URL("../assets/packed/", import.meta.url);
test("all 3600 animation frames contain one complete connected actor, a safe cell and no pixels below the ground", () => {
  let count = 0;
  const files = readdirSync(new URL("animation/", root)).filter((n) =>
    n.endsWith(".png"),
  );
  assert.equal(files.length, 98);
  for (const file of files) {
    const image = decodeRGBA(new URL("animation/" + file, root));
    assert.equal(image.width, 384);
    assert.equal(image.height % 96, 0);
    for (let row = 0; row < image.height / 96; row++)
      for (let col = 0; col < 4; col++) {
        const name = `${file} ${row},${col}`,
          report = inspectFrame(image, row, col),
          data = FRAME_DATA[file.slice(0, -4)][row * 4 + col];
        assert.ok(report.visible >= 150, name);
        assert.equal(
          report.components.length,
          1,
          `${name}: detached body piece`,
        );
        assert.equal(report.border, 0, `${name}: cell edge`);
        assert.equal(report.below, 0, `${name}: ground`);
        assert.deepEqual(
          report.bounds,
          data.slice(0, 4),
          `${name}: stale bounds`,
        );
        const handAlpha =
          image.pixels[
            ((row * 96 + data[5]) * image.width + col * 96 + data[4]) * 4 + 3
          ];
        assert.ok(handAlpha >= 144, `${name}: hand marker outside body`);
        count++;
      }
  }
  assert.equal(count, 3600);
});
test("complete transformation bodies retain their own authored models and safe anchors", () => {
  const files = Object.keys(FRAME_DATA).filter(
    (key) =>
      !key.startsWith("enemy-") &&
      !/-(motion|combat|reaction|signature)$/.test(key),
  );
  assert.equal(files.length, 20);
  for (const key of files) {
    const image = decodeRGBA(new URL(`sprites/${key}.png`, root));
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const report = inspectFrame(image, row, col);
        assert.equal(report.components.length, 1, `${key} ${row},${col}`);
        assert.equal(report.below, 0, key);
        assert.equal(report.border, 0, key);
      }
  }
});
test("transformation waits for complete target assets, swaps exactly once and returns to locomotion", () => {
  const a = new Animator();
  a.beginTransformation(0, 1);
  assert.equal(a.transformationView().phase, "prepare");
  a.update(0.3);
  assert.equal(a.transformationView().phase, "charge");
  assert.equal(a.visualForm, 0);
  const growth = a.transformationView().aura;
  a.update(0.4, () => false);
  assert.equal(a.visualForm, 0);
  assert.equal(a.transformationView().flash, 0);
  assert.ok(a.transformationView().aura > growth);
  a.update(0.02, () => true);
  assert.equal(a.visualForm, 1);
  assert.equal(a.sample().pack, "base");
  assert.equal(a.sample().frame, 0);
  assert.ok(a.transformationView().flash > 0);
  a.update(0.4);
  assert.equal(a.action, null);
  assert.equal(a.visualForm, 1);
  assert.equal(a.transformation, null);
});
