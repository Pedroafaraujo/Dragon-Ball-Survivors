import test from "node:test";
import assert from "node:assert/strict";
import { characters } from "../src/characters.js";
import { formIndex, thresholds } from "../src/transformations.js";
import { move, makeObstacles } from "../src/collisions.js";
import { xpNeeded, choices } from "../src/states.js";
import { upgrades, arenas } from "../src/config.js";
import { spawn, updateEnemies, hurt } from "../src/enemies.js";
import { attack } from "../src/weapons.js";
import { Effects } from "../src/effects.js";
test("all five warriors reach their final form at 30; no invented Saiyan forms", () => {
  assert.equal(characters.length, 5);
  for (const c of characters) {
    assert.equal(formIndex(c, 1), 0);
    assert.equal(formIndex(c, 30), c.forms.length - 1);
    thresholds(c).forEach((n, i) => {
      assert.equal(formIndex(c, n - 1), i);
      assert.equal(formIndex(c, n), i + 1);
    });
  }
  for (const id of ["krillin", "buu"])
    assert.ok(
      !characters.find((c) => c.id === id).forms.some((f) => f.includes("SSJ")),
    );
});
test("movement resolves obstacles and arena boundaries", () => {
  const p = { x: 50, y: 50, r: 10 };
  move(p, 100, 0, { width: 200, height: 200 }, [{ x: 150, y: 50, r: 20 }]);
  assert.ok(Math.hypot(p.x - 150, p.y - 50) >= 30);
  move(p, -999, -999, { width: 200, height: 200 }, []);
  assert.equal(p.x, 10);
  assert.equal(p.y, 10);
  assert.ok(makeObstacles().length > 50);
});
test("three distinct upgrades, increasing XP requirements, health cap", () => {
  const opts = choices(upgrades);
  assert.equal(new Set(opts.map((u) => u.id)).size, 3);
  for (let l = 1; l < 40; l++) assert.ok(xpNeeded(l + 1) > xpNeeded(l));
  const p = { maxHp: 100, hp: 95 };
  upgrades.find((u) => u.id === "health").apply(p);
  assert.equal(p.hp, 125);
  assert.equal(p.maxHp, 125);
});
function fixture(id = "goku") {
  const c = characters.find((c) => c.id === id);
  return {
    width: 800,
    height: 600,
    arena: arenas.namek,
    character: c,
    player: {
      x: 1800,
      y: 1800,
      r: 14,
      hp: 100,
      maxHp: 100,
      invuln: 0,
      level: 10,
      power: 1,
      haste: 1,
      area: 1,
      crit: 0,
    },
    time: 0,
    enemies: [],
    hostile: [],
    gems: [],
    bullets: [],
    lines: [],
    rings: [],
    obstacles: [],
    effects: new Effects(),
    save: { reduced: false },
    kills: 0,
    spawnClock: 999,
    shotClock: 0,
    specialClock: 0,
    ultimateClock: 0,
    stun: 0,
    notice() {},
    damage() {
      return 1;
    },
    finish(win) {
      this.won = win;
    },
  };
}
test("automatic weapons kill enemies and award collectible XP for every warrior", () => {
  for (const c of characters) {
    const g = fixture(c.id);
    spawn(g, "saibaman");
    const e = g.enemies[0];
    e.x = 1850;
    e.y = 1800;
    e.hp = 10;
    attack(g, 0.01);
    for (let i = 0; i < 20 && e.hp > 0; i++) attack(g, 0.02);
    assert.ok(e.hp <= 0, c.name);
    assert.equal(g.kills, 1);
    assert.equal(g.gems[0].value, 3);
  }
});
test("contact damage respects invulnerability", () => {
  const g = fixture();
  spawn(g, "saibaman");
  g.enemies[0].x = 1800;
  g.enemies[0].y = 1800;
  updateEnemies(g, 0.01);
  assert.equal(g.player.hp, 100); // Wind-up is visible before contact damage.
  for (let i = 0; i < 16; i++) updateEnemies(g, 0.01);
  assert.equal(g.player.hp, 91);
  updateEnemies(g, 0.01);
  assert.equal(g.player.hp, 91);
});
test("boss arrives at 20 minutes, changes phase, fires and triggers victory", () => {
  const g = fixture();
  g.time = 1200;
  updateEnemies(g, 0.01);
  const boss = g.enemies.find((e) => e.type === "freeza");
  assert.ok(boss);
  assert.equal(g.enemies.length, 1);
  boss.hp = boss.maxHp * 0.49;
  boss.attack = 0;
  updateEnemies(g, 0.01);
  assert.equal(boss.phase, 2);
  assert.equal(g.hostile.length, 0); // Boss charge must precede launch.
  for (let i = 0; i < 35; i++) updateEnemies(g, 0.01);
  assert.equal(g.hostile.length, 16);
  hurt(g, boss, 99999);
  assert.equal(g.won, true);
});
test("active enemy and particle limits are enforced", () => {
  const g = fixture();
  for (let i = 0; i < 300; i++) spawn(g, "saibaman");
  assert.equal(g.enemies.length, 180);
  for (let i = 0; i < 20; i++) g.effects.burst(0, 0, "white", 100);
  assert.equal(g.effects.items.length, 300);
});
