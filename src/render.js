import { appearance } from "./transformations.js";
import {
  assetStatus,
  drawCell,
  drawFighter,
  effect,
  drawEnemySprite,
  auraEffect,
  beamEffect,
} from "./sprites.js";
import { renderPosition, handAnchor } from "./animation.js";

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
  anim = null,
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  shadow(ctx, 0, 18);
  const transition = anim?.transformationView();
  if (form > 0 || transition) {
    ctx.save();
    ctx.globalAlpha =
      transition?.phase === "prepare"
        ? 0.08
        : transition && !transition.swapped
          ? 0.15 + transition.aura * 0.5
          : 0.65;
    const formName = c.forms[transition ? anim.transformation.to : form];
    const growth =
      transition && !transition.swapped ? 0.45 + transition.aura * 0.55 : 1;
    const cadence =
      formName === "Ultra Instinct"
        ? 5
        : formName === "Ultra Ego"
          ? 11
          : formName === "SSJ2"
            ? 12
            : formName === "SSJ3"
              ? 10
              : 8;
    const drawn = auraEffect(
      ctx,
      c.id === "buu" ? "Ultra Ego" : formName,
      Math.floor(time * cadence) % 4,
      0,
      -17,
      Math.round((formName === "SSJ3" ? 98 : 84) * growth),
      Math.round(
        (formName === "SSJ3" ? 132 : c.id === "krillin" ? 86 : 112) * growth,
      ),
    );
    if (!drawn)
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
    if (formName === "SSJ2") {
      ctx.strokeStyle = "#8be8ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const side = Math.floor(time * 14) % 2 ? 1 : -1;
      ctx.moveTo(side * 28, -42);
      ctx.lineTo(side * 21, -22);
      ctx.lineTo(side * 29, -18);
      ctx.lineTo(side * 23, 3);
      ctx.stroke();
    }
    ctx.restore();
  }
  drawFighter(ctx, c, form, time, direction, moving, anim);
  ctx.restore();
}
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
function enemy(ctx, e, time, alpha = 1) {
  const size = e.type === "freeza" ? 126 : Math.max(67, e.r * 4.6),
    pos = renderPosition(e, alpha);
  ctx.save();
  ctx.translate(Math.round(pos.x), Math.round(pos.y));
  shadow(ctx, 0, e.r, e.r);
  if (e.life !== undefined) ctx.globalAlpha = Math.min(1, e.life / 0.3);
  if (e.hit > 0) ctx.globalAlpha *= 0.75;
  if (e.bossCast && !e.bossCast.released) {
    const hand = handAnchor(e, e.anim?.direction || "south");
    effect(
      ctx,
      0,
      Math.floor(time * 12) % 4,
      hand.x - e.x,
      hand.y - e.y,
      25 + e.bossCast.time * 45,
      25 + e.bossCast.time * 45,
      "#da7bed",
    );
  }
  drawEnemySprite(ctx, e, size);
  ctx.restore();
  if (e.hp > 0 && e.hp < e.maxHp) {
    ctx.fillStyle = "#142a36";
    ctx.fillRect(
      Math.round(pos.x - e.r),
      Math.round(pos.y - e.r - 34),
      e.r * 2,
      3,
    );
    ctx.fillStyle = "#ffbf7a";
    ctx.fillRect(
      Math.round(pos.x - e.r),
      Math.round(pos.y - e.r - 34),
      e.r * 2 * Math.max(0, e.hp / e.maxHp),
      3,
    );
  }
}

function kiBeam(ctx, l, time, offset = { x: 0, y: 0 }) {
  const phase = Math.max(0, Math.min(1, (l.life - l.t) / l.life)),
    length = l.length * Math.min(1, phase / 0.32),
    angle = l.angle;
  const envelope = Math.min(1, (phase + 0.05) * 8, (1 - phase) * 8),
    width = Math.max(2, Math.min(84, l.width) * envelope);
  ctx.save();
  ctx.translate(Math.round(l.x + offset.x), Math.round(l.y + offset.y));
  ctx.rotate(angle);
  ctx.globalAlpha = 0.85;
  if (l.kind === "elastic") {
    ctx.fillStyle = "#a94e87";
    ctx.fillRect(0, -width * 0.5, length, width);
    ctx.fillStyle = "#f1a4c8";
    ctx.fillRect(0, -width * 0.3, length, width * 0.6);
    effect(ctx, 0, Math.floor(time * 12) % 4, length, 0, 26, 20, "#f1a4c8");
  } else {
    ctx.fillStyle = l.color;
    ctx.globalAlpha = 0.24;
    ctx.fillRect(0, -width * 0.85, length, width * 1.7);
    ctx.globalAlpha = 0.95;
    ctx.fillRect(0, -width * 0.5, length, width);
    ctx.fillStyle = "#edfaff";
    ctx.fillRect(
      0,
      -Math.max(1, width * 0.19),
      length,
      Math.max(2, width * 0.38),
    );
    const step = l.kind === "helix" ? 12 : 22,
      offset = (time * 180) % step;
    for (let x = offset; x < length; x += step) {
      const y = Math.sin(x * 0.09 - time * 24) * width * 0.5;
      ctx.fillStyle = l.kind === "helix" ? "#ffdb7e" : "#c8ffff";
      ctx.fillRect(Math.round(x), Math.round(y) - 2, 5, 4);
      if (l.kind === "helix")
        ctx.fillRect(Math.round(x), Math.round(-y) - 1, 4, 3);
    }
    if (l.key === "kamehameha" || l.key === "cannon")
      beamEffect(
        ctx,
        l.kind === "helix",
        Math.floor(time * 14) % 4,
        length,
        0,
        Math.max(32, width * 2.2),
        Math.max(24, width * 1.7),
      );
    else
      effect(
        ctx,
        0,
        Math.floor(time * 14) % 4,
        length,
        0,
        Math.max(20, width * 2),
        Math.max(20, width * 1.8),
        l.color,
      );
  }
  ctx.restore();
}
function castEffects(g, alpha = 1) {
  const ctx = g.ctx,
    pp = renderPosition(g.player, alpha);
  for (const cast of g.casts || []) {
    if (
      cast.released ||
      (cast.channel === 0 && (g.player.anim?.action?.priority || 0) > 4)
    )
      continue;
    const d = cast.def,
      progress = Math.min(1, cast.elapsed / (d.windup + d.charge)),
      hand = handAnchor(
        { ...g.player, x: pp.x, y: pp.y },
        cast.direction,
        d.hand,
      );
    const size =
      (cast.channel === 0
        ? 10
        : cast.key === "genki" || cast.key === "planet"
          ? 28
          : 14) +
      progress * (cast.channel === 2 ? 55 : 25);
    effect(
      ctx,
      cast.key === "kienzan" || cast.key === "discs" ? 1 : 0,
      Math.floor(cast.elapsed * 12) % 4,
      hand.x,
      hand.y,
      size,
      cast.key === "kienzan" || cast.key === "discs" ? size * 0.45 : size,
      d.color,
    );
    if (cast.channel > 0 && !g.save.reduced) {
      ctx.fillStyle = d.color;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + cast.elapsed * 3,
          r = 45 * (1 - progress) + 10;
        ctx.fillRect(
          Math.round(hand.x + Math.cos(a) * r),
          Math.round(hand.y + Math.sin(a) * r),
          2,
          2,
        );
      }
    }
  }
  for (const orb of g.orbs || []) {
    const size = orb.key === "bang" ? 36 : orb.key === "genki" ? 76 : 90;
    const position = renderPosition(orb, alpha);
    effect(
      ctx,
      0,
      Math.floor(orb.age * 12) % 4,
      position.x,
      position.y,
      size,
      size,
      orb.color,
    );
  }
}

export function draw(g, alpha = 1) {
  const { ctx, width: w, height: h } = g;
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#183e4c";
  ctx.fillRect(0, 0, w, h);
  if (!assetStatus.ready) return;
  const p = g.player || { x: 1800, y: 1800 },
    pos = g.player ? renderPosition(p, alpha) : p,
    shake = g.save.shake
      ? Math.sin(g.time * 100) * Math.max(g.flash * 5, (g.trauma || 0) * 7)
      : 0;
  const ox = Math.round(w / 2 - pos.x + shake),
    oy = Math.round(h / 2 - pos.y);
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
    if (e.hp > 0 && visible(e.x, e.y, 150, ox, oy, w, h))
      entities.push({ y: e.y + e.r, kind: "enemy", o: e });
  for (const corpse of g.corpses || [])
    entities.push({ y: corpse.y + corpse.r, kind: "enemy", o: corpse });
  if (g.player) entities.push({ y: p.y + 18, kind: "player", o: p });
  entities.sort((a, b) => a.y - b.y);
  for (const e of entities) {
    if (e.kind === "obstacle") obstacle(ctx, e.o, e.index);
    else if (e.kind === "enemy") enemy(ctx, e.o, g.time, alpha);
    else {
      const visualForm = p.anim?.visualForm ?? p.form;
      ctx.save();
      ctx.translate(Math.round(pos.x), Math.round(pos.y));
      if (p.invuln > 0) ctx.globalAlpha = 0.45 + Math.sin(g.time * 40) * 0.3;
      fighter(
        ctx,
        g.character,
        visualForm,
        g.time,
        p.anim?.direction || "south",
        p.anim?.motion !== "idle",
        p.anim,
      );
      ctx.restore();
    }
  }
  if (g.player) castEffects(g, alpha);
  for (const b of g.bullets) {
    const size = b.disc ? 42 : 30,
      position = renderPosition(b, alpha);
    effect(
      ctx,
      b.disc ? 1 : 0,
      Math.floor(g.time * 12) % 4,
      position.x,
      position.y,
      size,
      b.disc ? 24 : size,
      b.color,
    );
  }
  for (const b of g.hostile) {
    const position = renderPosition(b, alpha);
    effect(
      ctx,
      0,
      Math.floor(g.time * 12) % 4,
      position.x,
      position.y,
      32,
      32,
      "#ed74d0",
    );
  }
  for (const l of g.lines.slice(-8))
    kiBeam(ctx, l, g.time, { x: pos.x - p.x, y: pos.y - p.y });
  for (const r of g.rings) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, r.t * 3);
    effect(
      ctx,
      2,
      Math.min(3, Math.floor(((r.life - r.t) / r.life) * 4)),
      r.x,
      r.y,
      Math.min(640, r.r * 2),
      Math.min(640, r.r * 2),
      r.color,
    );
    ctx.restore();
  }
  g.effects.draw(ctx);
  ctx.textAlign = "center";
  ctx.font = "bold 11px monospace";
  for (const f of g.feedback || []) {
    ctx.globalAlpha = Math.min(1, f.t * 4);
    ctx.fillStyle = "#ffe7a0";
    ctx.fillText(
      String(f.damage),
      Math.round(f.x),
      Math.round(f.y - (0.55 - f.t) * 24),
    );
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const transitionFlash = g.player?.anim?.transformationView()?.flash || 0;
  if (transitionFlash > 0) {
    ctx.fillStyle = `rgba(235,250,255,${transitionFlash * 0.6})`;
    ctx.fillRect(0, 0, w, h);
  }
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
