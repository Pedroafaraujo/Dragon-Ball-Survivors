/** Pure sprite addressing. No rendering, palette changes or body-part mixing. */
import { FORM_CAST_DATA, MOVING_FRAME_DATA, FORM_SIGNATURE_DATA } from "./action-frames.js";
export const FORM_FILES = {
  goku: ["base", "ssj", "ssj2", "ssj3", "god", "blue", "ui"],
  vegeta: ["base", "ssj", "ssj2", "god", "blue", "ue"],
  gohan: ["base", "ssj", "ssj2", "ultimate", "beast"],
  buu: ["base"],
  krillin: ["base"],
};
export const DIRECTIONS = ["south", "west", "east", "north"];
export function characterKey(id, form = 0) {
  const forms = FORM_FILES[id];
  return `${id}-${forms[Math.max(0, Math.min(form, forms.length - 1))]}`;
}
export function playerFrame(id, form, sample) {
  const direction = Math.max(0, DIRECTIONS.indexOf(sample.direction));
  if (sample.pack === "base")
    return { key: characterKey(id, form), row: direction, frame: sample.frame };
  const suffix =
    FORM_FILES[id][Math.max(0, Math.min(form, FORM_FILES[id].length - 1))];
  const model = `${id}-${suffix}`, castKey = `${model}-cast`;
  if (Number.isInteger(sample.movementFrame)) {
    const movingModel = suffix === "base" ? id : model;
    const movingKey = `${movingModel}-moving-${sample.movementRole || "cast"}`;
    const movement = Math.max(0, DIRECTIONS.indexOf(sample.movementDirection));
    const opposite = [3, 2, 1, 0][direction];
    if (MOVING_FRAME_DATA[movingKey] && (movement === direction || movement === opposite))
      return { key: movingKey, row: direction,
        frame: movement === opposite ? 3 - sample.movementFrame : sample.movementFrame };
  }
  const signatureKey = `${model}-signature-cast`;
  if (sample.pack === "signature" && FORM_SIGNATURE_DATA[signatureKey])
    return { key: signatureKey, row: direction, frame: sample.frame };
  if (sample.pack === "reaction" && suffix !== "base") {
    if (sample.state === "transform" && FORM_CAST_DATA[castKey])
      return { key: castKey, row: direction, frame: sample.frame ? 1 : 0 };
    // The old form reaction sheets repeated this exact complete guard. Keep the
    // explicit fallback without loading 48 duplicate pixels frames per form.
    return { key: model, row: direction, frame: 0 };
  }
  if (FORM_CAST_DATA[castKey]) {
    const phase = sample.combatPhase;
    if ((["preparation", "charge"].includes(phase) && sample.pack === "combat") ||
        ["launch", "impact"].includes(phase) ||
        (phase === "recovery" && sample.pack !== "motion"))
      return { key: castKey, row: direction,
        frame: phase === "preparation" ? 0 : phase === "charge" ? 1 : phase === "recovery" ? 3 : 2 };
    if (!phase && sample.pack === "combat")
      return { key: castKey, row: direction,
        frame: sample.state === "charge" ? (sample.frame ? 1 : 0) : sample.state === "cast" ? (sample.frame === 3 ? 3 : 2) : sample.frame };
  }
  return {
    key:
      suffix === "base"
        ? `${id}-${sample.pack}`
        : `${id}-${suffix}-${sample.pack}`,
    row: sample.group + direction,
    frame: sample.frame,
  };
}
export function enemyFrame(id, sample) {
  const dir = Math.max(0, DIRECTIONS.indexOf(sample.direction));
  if (["idle", "walk", "run"].includes(sample.state))
    return {
      key: `enemy-${id}-motion`,
      row: (sample.state === "idle" ? 0 : 4) + dir,
      frame:
        sample.state === "idle"
          ? sample.frame
          : Math.floor(sample.phase * 4) % 4,
    };
  return {
    key: `enemy-${id}-combat`,
    row:
      (sample.state === "death"
        ? 8
        : ["hurt", "knockback"].includes(sample.state)
          ? 4
          : 0) + dir,
    frame: sample.frame,
  };
}
