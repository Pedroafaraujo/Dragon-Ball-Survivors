import { enemyTypes, limits, ginyuMembers } from "./config.js";
import { distance, move } from "./collisions.js";
import { animator, animateMotion, facing, handAnchor } from "./animation.js";
import { separation, impact } from "./motion.js";
import { projectilePool, reapProjectiles } from "./pool.js";
let enemySerial = 0;
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
    seed: ++enemySerial,
    contact: null,
    vx: 0,
    vy: 0,
    kx: 0,
    ky: 0,
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
  const repulsion = separation(g.enemies);
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    e.hit = Math.max(0, e.hit - dt);
    const anim = animator(e);
    anim.stride = 14 + e.r * 2.3;
    const d = distance(e, g.player) || 1,
      near = d < e.r + g.player.r + 14;
    if (!e.contact && near) {
      e.contact = { time: 0, hit: false, token: Symbol("contact") };
      anim.play("attack", {
        direction: facing(g.player.x - e.x, g.player.y - e.y, anim.direction),
        duration: e.r > 20 ? 0.62 : 0.46,
        token: e.contact.token,
        contactTiming: { windup: e.r > 20 ? 0.24 : 0.16, active: 0.1 },
      });
    }
    const slow = (g.stun > 0 ? 0.08 : 1) * (e.contact?.time < 0.2 ? 0.55 : 1);
    const ax = ((g.player.x - e.x) / d) * e.speed * slow,
      ay = ((g.player.y - e.y) / d) * e.speed * slow;
    const response = e.r > 20 ? 7 : e.type === "saibaman" ? 16 : 11,
      blend = 1 - Math.exp(-response * dt);
    e.vx += (ax - e.vx) * blend;
    e.vy += (ay - e.vy) * blend;
    const force = repulsion.get(e) || { x: 0, y: 0 },
      oldX = e.x,
      oldY = e.y;
    e.prevX = e.x;
    e.prevY = e.y;
    move(
      e,
      (e.vx + force.x + (e.kx || 0)) * dt,
      (e.vy + force.y + (e.ky || 0)) * dt,
      g.arena,
      g.obstacles,
    );
    e.kx = (e.kx || 0) * Math.exp(-11 * dt);
    e.ky = (e.ky || 0) * Math.exp(-11 * dt);
    animateMotion(e, oldX, oldY, dt, e.speed * 1.4);
    if (e.contact) {
      const previous = e.contact.time;
      e.contact.time += dt;
      if (anim.action?.token === e.contact.token) anim.action.elapsed = e.contact.time;
      const windup = e.r > 20 ? 0.24 : 0.16;
      if (previous < windup && e.contact.time >= windup && !e.contact.hit) {
        e.contact.hit = true;
        if (
          distance(e, g.player) < e.r + g.player.r + 4 &&
          g.player.invuln <= 0
        ) {
          g.player.hp -= e.damage;
          g.player.invuln = 0.65;
          impact(g, g.player, { x: e.x, y: e.y, damage: e.damage });
          g.effects.burst(g.player.x, g.player.y, "#ff6b78", 7);
        }
      }
      if (e.contact.time >= (e.r > 20 ? 0.62 : 0.46)) e.contact = null;
    }
    if (e.type === "freeza") {
      if (e.hp < e.maxHp / 2 && e.phase === 1) {
        e.phase = 2;
        e.speed = 110;
        g.notice("FREEZA · PODER MÁXIMO", 3);
        g.effects.burst(e.x, e.y, "#ca73ef", 50);
      }
      e.attack -= dt;
      if (e.attack <= 0 && !e.bossCast) {
        e.bossCast = { time: 0, released: false,
          direction: facing(g.player.x - e.x, g.player.y - e.y, anim.direction) };
        anim.play("charge", {
          direction: e.bossCast.direction,
          duration: 0.4,
          contactTiming: { windup: 0.4, active: 0.1 },
          priority: 5,
          token: Symbol("boss-charge"),
        });
      }
      if (e.bossCast) {
        e.bossCast.time += dt;
        if (e.bossCast.time >= 0.34 && !e.bossCast.released) {
          e.bossCast.released = true;
          const count = e.phase === 2 ? 16 : 10;
          anim.play("cast", {
            direction: e.bossCast.direction,
            duration: 0.3,
            priority: 5,
            token: Symbol("boss-cast"),
            contactTiming: { windup: 0, active: 0.16 },
          });
          const origin = handAnchor(e, anim.action?.direction || anim.direction);
          for (let i = 0; i < count; i++) {
            const b = projectilePool(g, true).acquire();
            if (!b) break;
            const a = (i / count) * Math.PI * 2 + g.time;
            Object.assign(b, {
              x: origin.x,
              y: origin.y,
              prevX: origin.x,
              prevY: origin.y,
              vx: Math.cos(a) * 190,
              vy: Math.sin(a) * 190,
              t: 5,
              r: 7,
              damage: 18,
            });
            g.hostile.push(b);
          }
        }
        if (e.bossCast.time >= 0.64) {
          e.bossCast = null;
          e.attack = e.phase === 2 ? 1.4 - 0.64 : 2.4 - 0.64;
        }
      }
    }
  }
  for (const b of g.hostile) {
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.t -= dt;
    if (distance(b, g.player) < b.r + g.player.r && g.player.invuln <= 0) {
      g.player.hp -= b.damage;
      g.player.invuln = 0.6;
      impact(g, g.player, { x: b.prevX, y: b.prevY, damage: b.damage });
      b.t = 0;
    }
  }
  reapProjectiles(g, true);
}
export function hurt(g, e, damage, feedback = {}) {
  if (e.hp <= 0) return;
  const crit = Math.random() < g.player.crit;
  e.hp -= damage * (crit ? 2 : 1);
  e.hit = 0.12;
  impact(g, e, { ...feedback, damage: damage * (crit ? 2 : 1) });
  if (e.hp <= 0) {
    g.kills++;
    animator(e).play("death", { force: true, token: Symbol("death") });
    const corpses = g.corpses || (g.corpses = []);
    corpses.push({ ...e, life: 1.1 });
    if (corpses.length > 24) corpses.shift();
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
