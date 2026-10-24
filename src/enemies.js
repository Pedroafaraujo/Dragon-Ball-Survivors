import { enemyTypes, limits, ginyuMembers } from "./config.js";
import { distance, move } from "./collisions.js";
export function spawn(g, type) {
  if (g.enemies.length >= limits.enemies && type !== "freeza") return;
  const a = Math.random() * Math.PI * 2,
    p = g.player,
    t = {
      ...enemyTypes[type],
      ...(type === "ginyu"
        ? ginyuMembers[Math.floor(Math.random() * ginyuMembers.length)]
        : {}),
    },
    radius = Math.max(g.width, g.height) / 2 + 120;
  g.enemies.push({
    ...t,
    type,
    x: Math.max(50, Math.min(g.arena.width - 50, p.x + Math.cos(a) * radius)),
    y: Math.max(50, Math.min(g.arena.height - 50, p.y + Math.sin(a) * radius)),
    damage: t.damage * (1 + g.time / 1000),
    maxHp: t.hp * (type === "freeza" ? 1 : 1 + g.time / 190),
    hp: t.hp * (type === "freeza" ? 1 : 1 + g.time / 190),
    phase: 1,
    attack: 2,
    hit: 0,
  });
}
export function updateEnemies(g, dt) {
  const wave = Math.floor(g.time / 60) + 1;
  if (wave > (g.wave || 0) && g.time < g.arena.duration) {
    g.wave = wave;
    g.notice(
      `ONDA ${wave} · ${wave < 4 ? "ENERGIA HOSTIL" : wave < 10 ? "A INVASÃO INTENSIFICA-SE" : "RESISTE ATÉ AO FIM"}`,
      2.5,
    );
  }
  g.spawnClock -= dt;
  if (g.time < g.arena.duration && g.spawnClock <= 0) {
    g.spawnClock = Math.max(0.13, 0.95 - g.time / 1600);
    const count = 1 + Math.floor(g.time / 180);
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      spawn(
        g,
        g.time > 150 && roll > 0.78
          ? "ginyu"
          : g.time > 40 && roll > 0.45
            ? "soldier"
            : "saibaman",
      );
    }
  }
  if (g.time >= g.arena.duration && !g.bossSpawned) {
    g.bossSpawned = true;
    spawn(g, "freeza");
    g.notice("FREEZA · A ÚLTIMA BATALHA", 4);
  }
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    e.hit = Math.max(0, e.hit - dt);
    const d = distance(e, g.player) || 1;
    const slow = g.stun > 0 ? 0.08 : 1;
    move(
      e,
      ((g.player.x - e.x) / d) * e.speed * dt * slow,
      ((g.player.y - e.y) / d) * e.speed * dt * slow,
      g.arena,
      g.obstacles,
    );
    if (d < e.r + g.player.r && g.player.invuln <= 0) {
      g.player.hp -= e.damage;
      g.player.invuln = 0.65;
      g.effects.burst(g.player.x, g.player.y, "#ff6b78");
    }
    if (e.type === "freeza") {
      if (e.hp < e.maxHp / 2 && e.phase === 1) {
        e.phase = 2;
        e.speed = 110;
        g.notice("FREEZA · PODER MÁXIMO", 3);
        g.effects.burst(e.x, e.y, "#ca73ef", 50);
      }
      e.attack -= dt;
      if (e.attack <= 0) {
        e.attack = e.phase === 2 ? 1.4 : 2.4;
        const count = e.phase === 2 ? 16 : 10;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + g.time;
          g.hostile.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * 190,
            vy: Math.sin(a) * 190,
            t: 5,
            r: 7,
            damage: 18,
          });
        }
      }
    }
  }
  for (const b of g.hostile) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.t -= dt;
    if (distance(b, g.player) < b.r + g.player.r && g.player.invuln <= 0) {
      g.player.hp -= b.damage;
      g.player.invuln = 0.6;
      b.t = 0;
    }
  }
  g.hostile = g.hostile.filter((b) => b.t > 0).slice(-180);
}
export function hurt(g, e, damage) {
  if (e.hp <= 0) return;
  const crit = Math.random() < g.player.crit;
  e.hp -= damage * (crit ? 2 : 1);
  e.hit = 0.12;
  if (e.hp <= 0) {
    g.kills++;
    if (!g.save.reduced) g.effects.burst(e.x, e.y, e.color, 7);
    if (e.type === "freeza") {
      g.finish(true);
      return;
    }
    if (g.gems.length >= limits.gems) {
      g.gems[0].value += e.xp;
    } else g.gems.push({ x: e.x, y: e.y, value: e.xp });
  }
}
