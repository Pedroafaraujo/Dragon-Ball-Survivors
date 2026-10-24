import { distance } from "./collisions.js";
import { hurt } from "./enemies.js";
import { limits } from "./config.js";
function blast(g, x, y, r, damage, color) {
  g.rings.push({ x, y, r, t: 0.65, color });
  for (const e of g.enemies)
    if (distance(e, { x, y }) < r + e.r) hurt(g, e, damage);
}
function beam(g, target, width, damage, color, length = 650) {
  const p = g.player,
    a = Math.atan2(target.y - p.y, target.x - p.x),
    dx = Math.cos(a),
    dy = Math.sin(a);
  g.lines.push({
    x: p.x,
    y: p.y,
    tx: p.x + dx * length,
    ty: p.y + dy * length,
    t: 0.35,
    color,
    width,
  });
  for (const e of g.enemies) {
    const ex = e.x - p.x,
      ey = e.y - p.y,
      dot = ex * dx + ey * dy;
    if (dot > 0 && dot < length && Math.abs(ex * dy - ey * dx) < width + e.r)
      hurt(g, e, damage);
  }
}
function projectile(
  g,
  a,
  { disc = false, damage = 18, pierce = 1, color = "#ffe18a" } = {},
) {
  if (g.bullets.length >= limits.projectiles) return;
  const p = g.player;
  g.bullets.push({
    x: p.x,
    y: p.y,
    vx: Math.cos(a) * 520,
    vy: Math.sin(a) * 520,
    t: 1.5,
    r: disc ? 11 : 6,
    damage: damage * g.damage(),
    pierce,
    hit: new Set(),
    color,
    disc,
  });
}
export function attack(g, dt) {
  const p = g.player,
    c = g.character;
  g.shotClock -= dt;
  g.specialClock -= dt;
  g.ultimateClock -= dt;
  let target = null,
    near = 650;
  for (const e of g.enemies) {
    const d = distance(e, p);
    if (e.hp > 0 && d < near) {
      near = d;
      target = e;
    }
  }
  if (target && g.shotClock <= 0) {
    g.shotClock = 0.65 / p.haste;
    const a = Math.atan2(target.y - p.y, target.x - p.x),
      count = 1 + (p.level >= 10 ? 1 : 0) + (p.level >= 25 ? 1 : 0);
    if (c.id === "buu") {
      beam(
        g,
        target,
        12 * p.area,
        30 * g.damage(),
        "#f1a4c8",
        Math.min(near + 20, 650),
      );
    } else if (c.id === "vegeta") {
      beam(g, target, 9 * p.area, 22 * g.damage(), "#c285ff");
    } else if (c.id === "gohan") {
      beam(g, target, 12 * p.area, 22 * g.damage(), "#ffe97d", 430);
    } else {
      for (let i = 0; i < count; i++)
        projectile(g, a + (i - (count - 1) / 2) * 0.13, {
          disc: c.id === "krillin",
          pierce: c.id === "krillin" ? 4 : 1,
        });
    }
  }
  if (target && p.level >= 3 && g.specialClock <= 0) {
    g.specialClock = 4 / p.haste;
    g.notice(c.weapons[1], 1);
    if (c.id === "krillin") {
      g.stun = 2.5;
      blast(g, p.x, p.y, 300 * p.area, 20 * g.damage(), "#fff4b5");
    } else if (c.id === "vegeta") {
      blast(g, target.x, target.y, 115 * p.area, 90 * g.damage(), "#83bfff");
    } else if (c.id === "buu") {
      const a = Math.atan2(target.y - p.y, target.x - p.x);
      for (let i = -2; i <= 2; i++)
        projectile(g, a + i * 0.2, { damage: 27, color: "#f495d6" });
    } else beam(g, target, 26 * p.area, 75 * g.damage(), "#73e8ff");
  }
  if (target && p.level >= 8 && g.ultimateClock <= 0) {
    g.ultimateClock = 11 / p.haste;
    g.notice(c.weapons[2], 1.5);
    if (c.id === "vegeta")
      beam(g, target, 60 * p.area, 210 * g.damage(), "#ffe89b", 900);
    else if (c.id === "gohan")
      beam(g, target, 14 * p.area, 310 * g.damage(), "#efb4ff", 1000);
    else if (c.id === "krillin") {
      const a = Math.atan2(target.y - p.y, target.x - p.x);
      const count = p.form >= 4 ? 3 : 2;
      for (let i = 0; i < count; i++)
        projectile(g, a + (i - (count - 1) / 2) * 0.2, {
          disc: true,
          damage: 95,
          pierce: 12,
        });
    } else
      blast(
        g,
        target.x,
        target.y,
        (c.id === "buu" ? 205 : 165) * p.area,
        160 * g.damage(),
        c.id === "buu" ? "#ed80d6" : "#9ae8ff",
      );
  }
  for (const b of g.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.t -= dt;
    for (const e of g.enemies) {
      if (e.hp > 0 && !b.hit.has(e) && distance(b, e) < b.r + e.r) {
        hurt(g, e, b.damage);
        b.hit.add(e);
        b.pierce--;
        if (!b.pierce) {
          b.t = 0;
          break;
        }
      }
    }
  }
  g.bullets = g.bullets.filter((b) => b.t > 0);
}
