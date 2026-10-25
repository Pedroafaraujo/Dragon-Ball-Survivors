import { distance } from "./collisions.js";
import { hurt } from "./enemies.js";
import { animator, facing, handAnchor } from "./animation.js";
import { projectilePool, reapProjectiles } from "./pool.js";
export const TECHNIQUES = Object.freeze({
  ki: {
    name: "Ki Blasts",
    kind: "projectile",
    color: "#ffe18a",
    windup: 0.04,
    charge: 0.04,
    active: 0.12,
    recovery: 0.1,
    hand: "palm",
  },
  elastic: {
    name: "Braço elástico",
    kind: "elastic",
    color: "#f1a4c8",
    windup: 0.04,
    charge: 0.04,
    active: 0.13,
    recovery: 0.12,
    damage: 30,
    width: 12,
  },
  galick: {
    name: "Galick Gun",
    kind: "beam",
    color: "#b787ff",
    windup: 0.05,
    charge: 0.12,
    active: 0.2,
    recovery: 0.12,
    damage: 22,
    width: 9,
    length: 650,
  },
  masenko: {
    name: "Masenko",
    kind: "beam",
    color: "#ffe97d",
    windup: 0.05,
    charge: 0.12,
    active: 0.2,
    recovery: 0.12,
    damage: 22,
    width: 12,
    length: 430,
    hand: "forehead",
  },
  kienzan: {
    name: "Kienzan",
    kind: "disc",
    color: "#ffde77",
    windup: 0.05,
    charge: 0.1,
    active: 0.12,
    recovery: 0.12,
    hand: "overhead",
  },
  kamehameha: {
    name: "Kamehameha",
    kind: "beam",
    color: "#73e8ff",
    windup: 0.12,
    charge: 0.34,
    active: 0.34,
    recovery: 0.22,
    damage: 75,
    width: 26,
    length: 650,
  },
  bang: {
    name: "Big Bang Attack",
    kind: "orb",
    color: "#83bfff",
    windup: 0.12,
    charge: 0.28,
    active: 0.3,
    recovery: 0.22,
    damage: 90,
    radius: 115,
    flight: 0.35,
  },
  barrage: {
    name: "Rajada de ki",
    kind: "barrage",
    color: "#f495d6",
    windup: 0.08,
    charge: 0.2,
    active: 0.22,
    recovery: 0.18,
  },
  taiyoken: {
    name: "Taiyoken",
    kind: "flash",
    color: "#fff4b5",
    windup: 0.1,
    charge: 0.28,
    active: 0.2,
    recovery: 0.2,
    damage: 20,
    radius: 300,
    hand: "forehead",
  },
  final: {
    name: "Final Flash",
    kind: "beam",
    color: "#ffe89b",
    windup: 0.2,
    charge: 0.65,
    active: 0.48,
    recovery: 0.3,
    damage: 210,
    width: 60,
    length: 900,
  },
  cannon: {
    name: "Special Beam Cannon",
    kind: "helix",
    color: "#efb4ff",
    windup: 0.16,
    charge: 0.5,
    active: 0.42,
    recovery: 0.24,
    damage: 310,
    width: 14,
    length: 1000,
    hand: "forehead",
  },
  discs: {
    name: "Kienzan duplo",
    kind: "discs",
    color: "#ffde77",
    windup: 0.12,
    charge: 0.3,
    active: 0.2,
    recovery: 0.2,
    hand: "overhead",
  },
  genki: {
    name: "Genki Dama",
    kind: "orb",
    color: "#9ae8ff",
    windup: 0.2,
    charge: 0.7,
    active: 0.4,
    recovery: 0.3,
    damage: 160,
    radius: 165,
    flight: 0.6,
    hand: "overhead",
  },
  planet: {
    name: "Planet Burst",
    kind: "orb",
    color: "#ed80d6",
    windup: 0.18,
    charge: 0.62,
    active: 0.4,
    recovery: 0.28,
    damage: 160,
    radius: 205,
    flight: 0.5,
    hand: "overhead",
  },
});
const loadouts = {
  goku: ["ki", "kamehameha", "genki"],
  vegeta: ["galick", "bang", "final"],
  buu: ["elastic", "barrage", "planet"],
  krillin: ["kienzan", "taiyoken", "discs"],
  gohan: ["masenko", "kamehameha", "cannon"],
};
export function scheduleCast(g, key, target, channel = 0) {
  const def = TECHNIQUES[key],
    a = animator(g.player),
    direction = facing(
      target.x - g.player.x,
      target.y - g.player.y,
      a.direction,
    );
  const signature = [
    "genki",
    "final",
    "masenko",
    "kienzan",
    "discs",
    "planet",
  ].includes(key);
  const cast = {
    signature,
    key,
    def,
    target: { x: target.x, y: target.y },
    elapsed: 0,
    channel,
    direction,
    phase: "preparation",
    released: false,
    token: Symbol(key),
  };
  (g.casts || (g.casts = [])).push(cast);
  a.play(channel === 0 ? "attack" : "charge", {
    direction,
    duration: def.windup + def.charge,
    priority: 3 + channel,
    token: cast.token,
    release: false,
    signature,
    hand: def.hand,
  });
  return cast;
}
function spawnProjectile(
  g,
  origin,
  angle,
  {
    disc = false,
    damage = 18,
    pierce = 1,
    color = "#ffe18a",
    technique = "ki",
  } = {},
) {
  const b = projectilePool(g).acquire();
  if (!b) return;
  b.hit.clear();
  Object.assign(b, {
    x: origin.x,
    y: origin.y,
    prevX: origin.x,
    prevY: origin.y,
    vx: Math.cos(angle) * 520,
    vy: Math.sin(angle) * 520,
    t: 1.5,
    age: 0,
    r: disc ? 11 : 6,
    damage: damage * g.damage(),
    pierce,
    color,
    disc,
    technique,
  });
  g.bullets.push(b);
}
function explosion(g, x, y, r, damage, color, key) {
  if (g.rings.length >= 12) g.rings.shift();
  g.rings.push({ x, y, r, t: 0.75, life: 0.75, color, key });
  for (const e of g.enemies)
    if (e.hp > 0 && distance(e, { x, y }) < r + e.r)
      hurt(g, e, damage, { x, y, strong: true });
}
function launch(g, cast) {
  const { def, key, direction, target } = cast,
    p = g.player,
    active = animator(p).action,
    originStyle =
      active && active.priority > 4 + cast.channel ? active.hand : def.hand;
  animator(p).play(cast.channel === 0 ? "attack" : "cast", {
    direction,
    duration: def.active + def.recovery,
    priority: 4 + cast.channel,
    token: Symbol(key + "-release"),
    signature: cast.signature,
    release: true,
    hand: def.hand,
  });
  const origin = handAnchor(p, direction, originStyle),
    angle = Math.atan2(target.y - origin.y, target.x - origin.x);
  cast.origin = origin;
  cast.angle = angle;
  if (cast.channel > 0) g.notice(def.name, 1);
  if (["beam", "helix", "elastic"].includes(def.kind)) {
    g.lines.push({
      x: origin.x,
      y: origin.y,
      tx:
        origin.x +
        Math.cos(angle) *
          (def.length || Math.min(650, distance(p, target) + 20)),
      ty:
        origin.y +
        Math.sin(angle) *
          (def.length || Math.min(650, distance(p, target) + 20)),
      angle,
      length: def.length || Math.min(650, distance(p, target) + 20),
      t: def.active,
      life: def.active,
      color: def.color,
      width: def.width * p.area,
      damage: def.damage * g.damage(),
      key,
      kind: def.kind,
      hand: originStyle,
      direction,
      hit: new Set(),
      strong: cast.channel > 0,
    });
  } else if (def.kind === "orb") {
    (g.orbs || (g.orbs = [])).push({
      x: origin.x,
      y: origin.y,
      sx: origin.x,
      sy: origin.y,
      tx: target.x,
      ty: target.y,
      age: 0,
      flight: def.flight,
      radius: def.radius * p.area,
      damage: def.damage * g.damage(),
      color: def.color,
      key,
    });
  } else if (def.kind === "flash") {
    g.stun = 2.5;
    explosion(
      g,
      p.x,
      p.y,
      def.radius * p.area,
      def.damage * g.damage(),
      def.color,
      key,
    );
  } else if (def.kind === "barrage") {
    for (let i = -2; i <= 2; i++)
      spawnProjectile(g, origin, angle + i * 0.2, {
        damage: 27,
        color: def.color,
        technique: key,
      });
  } else if (def.kind === "discs") {
    const count = p.form >= 4 ? 3 : 2;
    for (let i = 0; i < count; i++)
      spawnProjectile(g, origin, angle + (i - (count - 1) / 2) * 0.2, {
        disc: true,
        damage: 95,
        pierce: 12,
        color: def.color,
        technique: key,
      });
  } else {
    const count = 1 + (p.level >= 10 ? 1 : 0) + (p.level >= 25 ? 1 : 0);
    for (let i = 0; i < count; i++)
      spawnProjectile(g, origin, angle + (i - (count - 1) / 2) * 0.13, {
        disc: def.kind === "disc",
        pierce: def.kind === "disc" ? 4 : 1,
        color: def.color,
        technique: key,
      });
  }
}
export function advanceCasts(g, dt, { suspendCasting = false } = {}) {
  const casts = g.casts || (g.casts = []);
  for (const cast of casts) {
    if (suspendCasting) continue;
    const { def } = cast;
    cast.elapsed += dt;
    const release = def.windup + def.charge;
    cast.phase =
      cast.elapsed < def.windup
        ? "preparation"
        : cast.elapsed < release
          ? "charge"
          : cast.elapsed < release + def.active * 0.3
            ? "launch"
            : cast.elapsed < release + def.active
              ? "impact"
              : "recovery";
    if (!cast.released && cast.elapsed >= release) {
      cast.released = true;
      launch(g, cast);
    }
  }
  g.casts = casts.filter(
    (c) =>
      c.elapsed < c.def.windup + c.def.charge + c.def.active + c.def.recovery,
  );
  for (const l of g.lines) {
    const origin = handAnchor(g.player, l.direction, l.hand);
    l.x = origin.x;
    l.y = origin.y;
    l.tx = l.x + Math.cos(l.angle) * l.length;
    l.ty = l.y + Math.sin(l.angle) * l.length;
    const front = l.length * Math.min(1, (l.life - l.t + dt) / (l.life * 0.32)),
      dx = Math.cos(l.angle),
      dy = Math.sin(l.angle);
    for (const e of g.enemies) {
      if (e.hp <= 0 || l.hit.has(e)) continue;
      const ex = e.x - l.x,
        ey = e.y - l.y,
        dot = ex * dx + ey * dy;
      if (
        dot > -e.r &&
        dot < front + e.r &&
        Math.abs(ex * dy - ey * dx) < l.width + e.r
      ) {
        hurt(g, e, l.damage, { x: l.x, y: l.y, strong: l.strong });
        l.hit.add(e);
      }
    }
    l.t -= dt;
  }
  g.lines = g.lines.filter((l) => l.t > 0);
  for (const orb of g.orbs || (g.orbs = [])) {
    orb.prevX = orb.x;
    orb.prevY = orb.y;
    orb.age += dt;
    const f = Math.min(1, orb.age / orb.flight),
      smooth = f * f * (3 - 2 * f);
    orb.x = orb.sx + (orb.tx - orb.sx) * smooth;
    orb.y = orb.sy + (orb.ty - orb.sy) * smooth - Math.sin(f * Math.PI) * 42;
    if (f >= 1 && !orb.done) {
      orb.done = true;
      explosion(g, orb.tx, orb.ty, orb.radius, orb.damage, orb.color, orb.key);
    }
  }
  g.orbs = g.orbs.filter((o) => !o.done);
  for (const b of g.bullets) {
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.age += dt;
    b.t -= dt;
    for (const e of g.enemies) {
      if (e.hp <= 0 || b.hit.has(e)) continue;
      // Swept circle collision keeps fast discs reliable even on a slow device.
      const dx = b.x - b.prevX,
        dy = b.y - b.prevY,
        len = dx * dx + dy * dy,
        f = len
          ? Math.max(
              0,
              Math.min(1, ((e.x - b.prevX) * dx + (e.y - b.prevY) * dy) / len),
            )
          : 0;
      if (
        Math.hypot(e.x - (b.prevX + dx * f), e.y - (b.prevY + dy * f)) <
        b.r + e.r
      ) {
        hurt(g, e, b.damage, { x: b.prevX, y: b.prevY, strong: b.damage > 80 });
        b.hit.add(e);
        b.pierce--;
        g.effects.burst(e.x, e.y, b.color, 3);
        if (!b.pierce) {
          b.t = 0;
          break;
        }
      }
    }
  }
  reapProjectiles(g);
}
export function attack(g, dt) {
  if (g.player.anim?.action?.state === "transform") {
    advanceCasts(g, dt, { suspendCasting: true });
    return;
  }
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
  if (target) {
    const keys = loadouts[c.id];
    if (g.shotClock <= 0) {
      g.shotClock = 0.65 / p.haste;
      scheduleCast(g, keys[0], target, 0);
    }
    if (p.level >= 3 && g.specialClock <= 0) {
      g.specialClock = 4 / p.haste;
      scheduleCast(g, keys[1], target, 1);
    }
    if (p.level >= 8 && g.ultimateClock <= 0) {
      g.ultimateClock = 11 / p.haste;
      scheduleCast(g, keys[2], target, 2);
    }
  }
  advanceCasts(g, dt);
}
