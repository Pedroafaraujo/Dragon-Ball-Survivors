import { drawCell } from "./sprites.js";
export const FX_STYLES = ["beam-blue", "beam-violet", "beam-gold", "helix", "ki", "disc", "genki", "bang", "planet", "charge", "explosion", "impact", "elastic", "flash", "explosion-blue", "explosion-pink", "ki-blue", "ki-pink"];
export function combatSprite(ctx, style, frame, x, y, width, height = width) {
  const row = FX_STYLES.indexOf(style);
  if (row < 0) return false;
  frame = Math.max(0, Math.min(7, Math.floor(frame)));
  return drawCell(ctx, "combat-fx", frame % 4, row * 2 + Math.floor(frame / 4),
    Math.round(x - width / 2), Math.round(y - height / 2), Math.round(width), Math.round(height));
}
export function energyStyle(key) {
  if (["kienzan", "discs"].includes(key)) return "disc";
  if (["genki", "bang", "planet"].includes(key)) return key;
  if (["galick", "barrage"].includes(key)) return "planet";
  if (["masenko", "final"].includes(key)) return "ki";
  if (key === "taiyoken") return "flash";
  return "charge";
}
export function drawCombatBeam(ctx, line, offset, reduced = false) {
  const phase = Math.max(0, Math.min(1, (line.life - line.t) / line.life));
  const length = line.length * Math.min(1, phase / 0.32);
  if (length <= 0) return;
  const envelope = Math.min(1, (phase + 0.05) * 8, (1 - phase) * 8);
  const width = Math.max(2, Math.min(84, line.width) * envelope);
  const frame = Math.floor((line.life - line.t) * 24) % 8;
  const style = line.kind === "elastic" ? "elastic" : line.kind === "helix" ? "helix" : line.key === "galick" ? "beam-violet" : ["final", "masenko"].includes(line.key) ? "beam-gold" : "beam-blue";
  ctx.save();
  ctx.translate(Math.round(line.x + offset.x), Math.round(line.y + offset.y));
  ctx.rotate(line.angle);
  // A bounded strip of hand-drawn animated tiles replaces the flat rectangles.
  const segments = Math.min(24, Math.ceil(length / (reduced ? 72 : 48)));
  const step = length / segments;
  ctx.globalAlpha *= Math.min(1, (1 - phase) * 7);
  for (let i = 0; i < segments; i++) {
    combatSprite(ctx, style, frame, (i + 0.5) * step, 0, step + 1, width * 2.4);
  }
  if (line.kind !== "elastic") {
    combatSprite(ctx, energyStyle(line.key), frame, 0, 0, Math.max(14, width * 0.7));
    combatSprite(ctx, energyStyle(line.key), frame, length, 0, Math.max(24, width * 2));
  }
  ctx.restore();
}
