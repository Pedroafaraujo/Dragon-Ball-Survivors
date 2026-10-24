import test from "node:test";
import assert from "node:assert/strict";
import { Animator, CLIPS, handAnchor, facing } from "../src/animation.js";
import { playerMotion, separation } from "../src/motion.js";
import { Pool } from "../src/pool.js";
import { Effects } from "../src/effects.js";
import { scheduleCast, advanceCasts, TECHNIQUES } from "../src/weapons.js";
import { characters } from "../src/characters.js";
import { readFileSync, statSync } from "node:fs";
test("all ten animation states have frame sequences, directions, priorities and finite durations", () => {
  assert.equal(Object.keys(CLIPS).length, 10);
  for (const [name, clip] of Object.entries(CLIPS)) {
    assert.ok(clip.frames.length >= 2, name);
    assert.ok(clip.duration > 0, name);
    const a = new Animator();
    a.play(name, { direction: "west", token: name, force: true });
    a.update(clip.duration * 0.6);
    assert.equal(a.sample().direction, "west");
    assert.ok(clip.frames.includes(a.sample().frame));
  }
});
test("animation events do not restart clips; death has priority and remains on last frame", () => {
  const a = new Animator();
  a.play("charge", { token: "one" });
  a.update(0.15);
  assert.equal(a.play("charge", { token: "one" }), false);
  assert.equal(a.action.elapsed, 0.15);
  a.play("death", { token: "dead" });
  assert.equal(a.play("attack"), false);
  a.update(9);
  assert.equal(a.sample().frame, 3);
  assert.equal(a.sample().state, "death");
});
test("stride follows measured travel independently of frame rate; idle cannot advance a walk cycle", () => {
  const simulate = (hz) => {
    const a = new Animator();
    for (let i = 0; i < hz; i++) {
      a.motionStep(120 / hz, 0, 1 / hz, 190);
      a.update(1 / hz);
    }
    return a;
  };
  const a = simulate(30),
    b = simulate(120);
  assert.ok(Math.abs(a.travel - b.travel) < 1e-10);
  assert.equal(a.sample().frame, b.sample().frame);
  const distance = a.travel;
  for (let i = 0; i < 120; i++) a.motionStep(0, 0, 1 / 60, 190);
  assert.equal(a.travel, distance);
  assert.equal(a.sample().state, "idle");
  assert.equal(facing(1, 1, "west"), "east");
});
test("player reaches existing speed smoothly, brakes within 100ms and stops animating against a wall", () => {
  const g = {
    player: { x: 400, y: 400, r: 14, speed: 190, form: 0 },
    arena: { width: 1000, height: 1000 },
    obstacles: [],
  };
  playerMotion(g, { x: 1, y: 0 }, 1 / 60);
  assert.ok(g.player.vx > 0 && g.player.vx < 190);
  for (let i = 0; i < 30; i++) playerMotion(g, { x: 1, y: 0 }, 1 / 60);
  assert.equal(g.player.vx, 190);
  const start = g.player.x;
  for (let i = 0; i < 6; i++) playerMotion(g, { x: 0, y: 0 }, 1 / 60);
  assert.equal(g.player.vx, 0);
  assert.ok(g.player.x - start < 9);
  g.player.x = 986;
  for (let i = 0; i < 12; i++) playerMotion(g, { x: 1, y: 0 }, 1 / 60);
  assert.equal(g.player.anim.motion, "idle");
});
test("overlapping enemies separate with bounded opposite impulses including heavy bosses", () => {
  const enemies = [
      { x: 0, y: 0, r: 15, seed: 1, hp: 10 },
      { x: 0, y: 0, r: 15, seed: 2, hp: 10 },
      { x: 0, y: 0, r: 34, seed: 3, hp: 100, type: "freeza" },
    ],
    s = separation(enemies);
  assert.ok(s.get(enemies[0]).x < 0);
  assert.ok(s.get(enemies[2]).x > 0);
  assert.ok(Math.hypot(...Object.values(s.get(enemies[2]))) <= 8.0001);
});
function fixture(id = "goku") {
  return {
    character: characters.find((c) => c.id === id),
    player: {
      x: 400,
      y: 400,
      r: 14,
      level: 8,
      form: 0,
      area: 1,
      haste: 1,
      crit: 0,
    },
    enemies: [{ x: 640, y: 400, r: 15, hp: 1000, xp: 3, type: "saibaman" }],
    bullets: [],
    lines: [],
    rings: [],
    hostile: [],
    orbs: [],
    casts: [],
    effects: new Effects(),
    kills: 0,
    gems: [],
    corpses: [],
    save: { reduced: true },
    damage: () => 1,
    notice() {},
    finish() {},
  };
}
test("beam cannot damage during charge; extending beam damages once at impact and originates at hands", () => {
  const g = fixture();
  scheduleCast(g, "kamehameha", g.enemies[0], 1);
  for (let i = 0; i < 20; i++) advanceCasts(g, 0.02);
  assert.equal(g.enemies[0].hp, 1000);
  for (let i = 0; i < 10; i++) advanceCasts(g, 0.02);
  assert.equal(g.enemies[0].hp, 925);
  assert.equal(g.lines[0].x, handAnchor(g.player, "east").x);
  for (let i = 0; i < 35; i++) advanceCasts(g, 0.02);
  assert.equal(g.enemies[0].hp, 925);
  assert.equal(g.casts.length, 0);
});
test("every existing named special finishes preparation, launch, impact and recovery", () => {
  for (const key of [
    "kamehameha",
    "galick",
    "final",
    "masenko",
    "kienzan",
    "genki",
    "bang",
    "planet",
    "cannon",
    "taiyoken",
    "elastic",
    "barrage",
    "discs",
  ]) {
    const g = fixture();
    const cast = scheduleCast(g, key, g.enemies[0], 1);
    const phases = new Set();
    for (let i = 0; i < 200; i++) {
      advanceCasts(g, 0.01);
      phases.add(cast.phase);
    }
    assert.ok(cast.released, key);
    assert.equal(g.casts.length, 0, key);
    assert.ok(
      phases.has("preparation") &&
        phases.has("charge") &&
        phases.has("launch") &&
        phases.has("impact") &&
        phases.has("recovery"),
      key,
    );
    assert.ok(g.enemies[0].hp < 1000, key);
  }
});
test("projectile and particle pools reuse objects and do not retain old hit targets", () => {
  const pool = new Pool(() => ({ hit: new Set() }), 2),
    first = pool.acquire(),
    second = pool.acquire();
  assert.equal(pool.acquire(), null);
  first.hit.add({});
  pool.release(first);
  assert.equal(pool.acquire(), first);
  assert.equal(first.hit.size, 0);
  pool.release(second);
  const effects = new Effects();
  for (let i = 0; i < 30; i++) {
    effects.burst(0, 0, "white", 300);
    effects.update(2);
  }
  assert.equal(effects.items.length, 0);
  assert.equal(effects.pool.allocated, 300);
});
test("authored animation atlases cover all five players, forms and nine enemy variants", () => {
  const m = JSON.parse(
    readFileSync(new URL("../assets/animation-manifest.json", import.meta.url)),
  );
  assert.equal(m.sheets.length, 99);
  for (const sheet of m.sheets) {
    const png = readFileSync(
      new URL("../assets/" + sheet.runtime, import.meta.url),
    );
    assert.equal(png.readUInt32BE(16), 384);
    assert.equal(png.readUInt32BE(20), sheet.rows * 96);
    if (sheet.key !== "auras")
      assert.equal(sheet.anchors.length, sheet.rows * 4);
    if (sheet.anchors)
      for (const anchor of sheet.anchors) assert.equal(anchor.ground, 84);
  }
  assert.ok(m.sheets.some((s) => s.key === "enemy-freeza2-combat"));
});

test("all shipped runtime textures fit a 16 MiB transfer budget and animation directions remain explicit", () => {
  const legacy = JSON.parse(
      readFileSync(new URL("../assets/manifest.json", import.meta.url)),
    ),
    motion = JSON.parse(
      readFileSync(
        new URL("../assets/animation-manifest.json", import.meta.url),
      ),
    );
  const bytes = [...legacy.sheets, ...motion.sheets].reduce(
    (sum, s) =>
      sum + statSync(new URL("../assets/" + s.runtime, import.meta.url)).size,
    0,
  );
  assert.ok(bytes < 16 * 1024 * 1024, `texture budget exceeded: ${bytes}`);
  assert.equal(
    Object.keys(CLIPS).filter((k) => ["idle", "walk", "run"].includes(k))
      .length,
    3,
  );
});
