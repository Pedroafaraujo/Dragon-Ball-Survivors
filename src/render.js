import { appearance } from "./transformations.js";
import {
  assetStatus,
  drawCell,
  drawFighter,
  effect,
  getSheet,
} from "./sprites.js";

// Facing and animation are presentation state, deliberately kept off game entities.
const poses = new WeakMap();
function pose(entity, time) {
  let p = poses.get(entity);
  if (!p) {
    p = {
      x: entity.x,
      y: entity.y,
      direction: "south",
      moving: false,
      lastMotion: time,
    };
    poses.set(entity, p);
  }
  const dx = entity.x - p.x,
    dy = entity.y - p.y;
  if (Math.abs(dx) + Math.abs(dy) > 0.02) {
    p.direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? "west"
          : "east"
        : dy < 0
          ? "north"
          : "south";
    p.lastMotion = time;
  }
  p.moving = time - p.lastMotion < 0.1;
  p.x = entity.x;
  p.y = entity.y;
  return p;
}
function shadow(ctx, x, y, r = 15) {
  ctx.fillStyle = "#102e4470";
  ctx.fillRect(Math.round(x - r), Math.round(y - 3), r * 2, 6);
  ctx.fillRect(Math.round(x - r + 4), Math.round(y - 5), r * 2 - 8, 10);
}
export function fighter(
  ctx,
  c,
  form = 0,
  time = 0,
  direction = "south",
  moving = false,
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  shadow(ctx, 0, 18);
  if (form > 0) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    effect(
      ctx,
      3,
      Math.floor(time * 8) % 4,
      0,
      -17,
      84,
      112,
      appearance(c, form).aura,
    );
    ctx.restore();
  }
  drawFighter(ctx, c, form, time, direction, moving);
  ctx.restore();
}
const ginyuRows = { Guldo: 2, Recoome: 3, Burter: 4, Jeice: 5, Ginyu: 6 };
const lakes = [
  { x: 1430, y: 1420, w: 250, h: 210, variant: 0 },
  { x: 2070, y: 1970, w: 330, h: 250, variant: 1 },
  { x: 650, y: 2300, w: 360, h: 260, variant: 0 },
  { x: 2800, y: 850, w: 390, h: 280, variant: 1 },
  { x: 900, y: 750, w: 310, h: 230, variant: 0 },
  { x: 2750, y: 2850, w: 350, h: 270, variant: 0 },
];
function visible(x, y, r, ox, oy, w, h) {
  return x + r > -ox && x - r < w - ox && y + r > -oy && y - r < h - oy;
}
function terrain(g, ox, oy) {
  const ctx = g.ctx,
    s = 96;
  const left = Math.max(0, Math.floor(-ox / s)),
    right = Math.min(
      Math.ceil(g.arena.width / s),
      Math.ceil((g.width - ox) / s),
    );
  const top = Math.max(0, Math.floor(-oy / s)),
    bottom = Math.min(
      Math.ceil(g.arena.height / s),
      Math.ceil((g.height - oy) / s),
    );
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++) {
      const n = (x * 17 + y * 31) % 19;
      drawCell(ctx, "namek", n % 4, 0, x * s, y * s, s, s);
    }
  for (const lake of lakes)
    if (
      visible(
        lake.x,
        lake.y,
        Math.max(lake.w, lake.h),
        ox,
        oy,
        g.width,
        g.height,
      )
    ) {
      drawCell(
        ctx,
        "namek",
        lake.variant,
        1,
        lake.x - lake.w / 2,
        lake.y - lake.h / 2,
        lake.w,
        lake.h,
      );
      // Highlights stay cosmetic: existing collision geometry is unchanged.
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(g.time * 2 + lake.x);
      drawCell(
        ctx,
        "namek",
        lake.variant,
        1,
        lake.x - lake.w / 2 + 1,
        lake.y - lake.h / 2,
        lake.w,
        lake.h,
      );
      ctx.globalAlpha = 1;
    }
  ctx.strokeStyle = "#93d8b1";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, g.arena.width, g.arena.height);
}
function obstacle(ctx, o, index) {
  const tree = index % 3 === 0,
    size = tree ? o.r * 4.8 : o.r * 3;
  shadow(ctx, o.x, o.y + o.r * 0.5, o.r * 0.8);
  drawCell(
    ctx,
    "namek",
    index % 4,
    tree ? 3 : 2,
    o.x - size / 2,
    o.y + o.r - size,
    size,
    size,
  );
}
function enemy(ctx, e, time) {
  const p = pose(e, time),
    row =
      e.type === "saibaman"
        ? 0
        : e.type === "soldier"
          ? 1
          : e.type === "ginyu"
            ? (ginyuRows[e.name] ?? 6)
            : e.phase === 2
              ? 8
              : 7;
  const size = e.type === "freeza" ? 126 : Math.max(67, e.r * 4.6);
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y));
  shadow(ctx, 0, e.r, e.r);
  if (e.type === "freeza" && e.phase === 2) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    effect(
      ctx,
      3,
      Math.floor(time * 8) % 4,
      0,
      -9,
      size,
      size * 1.15,
      "#d470f2",
    );
    ctx.restore();
  }
  if (e.hit > 0) ctx.globalAlpha = 0.7;
  if (p.direction === "west") ctx.scale(-1, 1);
  drawCell(
    ctx,
    "enemies",
    p.moving ? 1 + (Math.floor(time * 8 + e.r) % 3) : 0,
    row,
    -size / 2,
    e.r - size + size * 0.125,
    size,
    size,
  );
  ctx.restore();
  if (e.hp < e.maxHp) {
    ctx.fillStyle = "#142a36";
    ctx.fillRect(Math.round(e.x - e.r), Math.round(e.y - e.r - 34), e.r * 2, 3);
    ctx.fillStyle = "#ffbf7a";
    ctx.fillRect(
      Math.round(e.x - e.r),
      Math.round(e.y - e.r - 34),
      e.r * 2 * Math.max(0, e.hp / e.maxHp),
      3,
    );
  }
}
function kiBeam(ctx, l, time) {
  const length = Math.hypot(l.tx - l.x, l.ty - l.y),
    angle = Math.atan2(l.ty - l.y, l.tx - l.x);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(angle);
  ctx.globalAlpha = Math.min(1, l.t * 5);
  ctx.fillStyle = l.color;
  ctx.fillRect(0, -l.width / 2, length, l.width);
  ctx.fillStyle = "#e8ffff";
  ctx.fillRect(
    0,
    -Math.max(2, l.width * 0.12),
    length,
    Math.max(4, l.width * 0.24),
  );
  // Repeated animated PNG cores add pixel coronas without per-frame filters.
  const step = Math.max(45, l.width * 1.5),
    count = Math.min(18, Math.ceil(length / step));
  for (let i = 0; i < count; i++)
    effect(
      ctx,
      0,
      Math.floor(time * 12 + i) % 4,
      ((i + 0.5) * length) / count,
      0,
      Math.max(40, l.width * 2),
      Math.max(35, l.width * 1.7),
      l.color,
    );
  ctx.restore();
}
export function draw(g) {
  const { ctx, width: w, height: h } = g;
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#183e4c";
  ctx.fillRect(0, 0, w, h);
  if (!assetStatus.ready) return;
  const p = g.player || { x: 1800, y: 1800 },
    shake =
      g.flash > 0 && g.save.shake ? Math.sin(g.time * 100) * g.flash * 5 : 0;
  const ox = Math.round(w / 2 - p.x + shake),
    oy = Math.round(h / 2 - p.y);
  ctx.save();
  ctx.translate(ox, oy);
  terrain(g, ox, oy);
  for (const gem of g.gems) {
    ctx.fillStyle = "#174f76";
    ctx.fillRect(Math.round(gem.x - 4), Math.round(gem.y - 6), 8, 12);
    ctx.fillStyle = "#5fe5e5";
    ctx.fillRect(Math.round(gem.x - 3), Math.round(gem.y - 5), 6, 9);
    ctx.fillStyle = "#c8ffff";
    ctx.fillRect(Math.round(gem.x - 2), Math.round(gem.y - 4), 2, 5);
  }
  const entities = [];
  g.obstacles.forEach((o, index) => {
    if (visible(o.x, o.y, 180, ox, oy, w, h))
      entities.push({ y: o.y + o.r, kind: "obstacle", o, index });
  });
  for (const e of g.enemies)
    if (visible(e.x, e.y, 150, ox, oy, w, h))
      entities.push({ y: e.y + e.r, kind: "enemy", o: e });
  if (g.player) entities.push({ y: p.y + 18, kind: "player", o: p });
  entities.sort((a, b) => a.y - b.y);
  for (const e of entities) {
    if (e.kind === "obstacle") obstacle(ctx, e.o, e.index);
    else if (e.kind === "enemy") enemy(ctx, e.o, g.time);
    else {
      const facing = pose(p, g.time);
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      if (p.invuln > 0) ctx.globalAlpha = 0.45 + Math.sin(g.time * 40) * 0.3;
      fighter(
        ctx,
        g.character,
        p.form,
        g.time,
        facing.direction,
        facing.moving,
      );
      ctx.restore();
    }
  }
  for (const b of g.bullets) {
    const size = b.disc ? 42 : 30;
    effect(
      ctx,
      b.disc ? 1 : 0,
      Math.floor(g.time * 12) % 4,
      b.x,
      b.y,
      size,
      b.disc ? 24 : size,
      b.color,
    );
  }
  for (const b of g.hostile)
    effect(ctx, 0, Math.floor(g.time * 12) % 4, b.x, b.y, 32, 32, "#ed74d0");
  for (const l of g.lines) kiBeam(ctx, l, g.time);
  for (const r of g.rings) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, r.t * 2);
    effect(
      ctx,
      2,
      Math.min(3, Math.floor(((0.65 - r.t) / 0.65) * 4)),
      r.x,
      r.y,
      r.r * 2,
      r.r * 2,
      r.color,
    );
    ctx.restore();
  }
  g.effects.draw(ctx);
  ctx.restore();
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(239,244,209,${g.flash * 0.3})`;
    ctx.fillRect(0, 0, w, h);
  }
  const boss = g.enemies.find((e) => e.type === "freeza" && e.hp > 0);
  if (boss) {
    ctx.fillStyle = "#152331";
    ctx.fillRect(w * 0.2, h - 45, w * 0.6, 12);
    ctx.fillStyle = boss.phase === 1 ? "#d798ed" : "#f294c0";
    ctx.fillRect(
      w * 0.2,
      h - 45,
      w * 0.6 * Math.max(0, boss.hp / boss.maxHp),
      12,
    );
    ctx.fillStyle = "#fff";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`FREEZA · FASE ${boss.phase}`, w / 2, h - 55);
  }
}
