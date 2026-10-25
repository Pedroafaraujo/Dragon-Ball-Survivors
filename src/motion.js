import { move } from "./collisions.js";
import { animateMotion, animator } from "./animation.js";
const toward = (value, target, delta) =>
  value < target
    ? Math.min(target, value + delta)
    : Math.max(target, value - delta);
export function playerMotion(g, input, dt) {
  const p = g.player,
    max = p.speed * (1 + p.form * 0.035),
    stopping = Math.hypot(input.x, input.y) < 0.01;
  if (p.anim?.action?.state === "transform") {
    p.prevX = p.x;
    p.prevY = p.y;
    p.vx = p.vy = 0;
    animateMotion(p, p.x, p.y, dt, max);
    return;
  }
  const acceleration = stopping ? 2600 : 1900;
  const dx = input.x * max - (p.vx || 0),
    dy = input.y * max - (p.vy || 0),
    length = Math.hypot(dx, dy),
    blend = length ? Math.min(1, (acceleration * dt) / length) : 1;
  p.vx = (p.vx || 0) + dx * blend;
  p.vy = (p.vy || 0) + dy * blend;
  if (stopping && Math.hypot(p.vx, p.vy) < 7) p.vx = p.vy = 0;
  const oldX = p.x,
    oldY = p.y;
  p.prevX = p.x;
  p.prevY = p.y;
  move(
    p,
    (p.vx + (p.kx || 0)) * dt,
    (p.vy + (p.ky || 0)) * dt,
    g.arena,
    g.obstacles,
  );
  if (Math.abs(p.x - oldX) < 0.001) p.vx = 0;
  if (Math.abs(p.y - oldY) < 0.001) p.vy = 0;
  p.kx = (p.kx || 0) * Math.exp(-14 * dt);
  p.ky = (p.ky || 0) * Math.exp(-14 * dt);
  animateMotion(p, oldX, oldY, dt, max);
}
export function separation(enemies) {
  const cells = new Map(),
    forces = new Map(),
    size = 64;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const key = `${Math.floor(e.x / size)},${Math.floor(e.y / size)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(e);
  }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    let x = 0,
      y = 0;
    const cx = Math.floor(e.x / size),
      cy = Math.floor(e.y / size);
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++)
        for (const other of cells.get(`${cx + ox},${cy + oy}`) || []) {
          if (e === other) continue;
          let dx = e.x - other.x,
            dy = e.y - other.y,
            d = Math.hypot(dx, dy),
            min = (e.r + other.r) * 0.9;
          if (d < min) {
            if (d < 0.01) {
              dx = (e.seed || 1) < (other.seed || 2) ? -1 : 1;
              dy = dx * 0.3;
              d = Math.hypot(dx, dy);
            }
            const power = ((min - d) / min) * 45;
            x += (dx / d) * power;
            y += (dy / d) * power;
          }
        }
    const magnitude = Math.hypot(x, y),
      cap = e.type === "freeza" ? 8 : e.r > 20 ? 18 : 32;
    if (magnitude > cap) {
      x *= cap / magnitude;
      y *= cap / magnitude;
    }
    forces.set(e, { x, y });
  }
  return forces;
}
export function impact(
  g,
  entity,
  {
    x = g.player?.x || 0,
    y = g.player?.y || 0,
    strong = false,
    damage = 0,
  } = {},
) {
  const a = animator(entity),
    d = Math.hypot(entity.x - x, entity.y - y) || 1;
  const force =
    entity.type === "freeza" ? (strong ? 40 : 10) : strong ? 135 : 45;
  entity.kx = Math.max(
    -160,
    Math.min(160, (entity.kx || 0) + ((entity.x - x) / d) * force),
  );
  entity.ky = Math.max(
    -160,
    Math.min(160, (entity.ky || 0) + ((entity.y - y) / d) * force),
  );
  a.play(strong ? "knockback" : "hurt", { token: Symbol("hit") });
  if (g.feedback) {
    g.feedback.push({
      x: entity.x,
      y: entity.y - 24,
      t: 0.55,
      damage: Math.round(damage),
    });
    if (g.feedback.length > 30) g.feedback.shift();
  }
  if (strong && (g.feedbackCooldown || 0) <= 0) {
    g.hitStop = 0.032;
    g.trauma = Math.max(g.trauma || 0, 0.35);
    g.feedbackCooldown = 0.14;
  }
}
