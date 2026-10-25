/** Pure sprite addressing. No rendering, palette changes or body-part mixing. */
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
