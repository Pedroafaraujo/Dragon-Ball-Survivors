export const State = Object.freeze({
  MENU: "menu",
  PLAY: "play",
  PAUSE: "pause",
  LEVEL: "level",
  WIN: "win",
  LOSE: "lose",
});
export function loadSave() {
  try {
    return {
      ...{ best: 0, kills: 0, reduced: false, shake: true },
      ...JSON.parse(localStorage.getItem("db-survivors") || "{}"),
    };
  } catch {
    return { best: 0, kills: 0, reduced: false, shake: true };
  }
}
export function persist(save) {
  try {
    localStorage.setItem("db-survivors", JSON.stringify(save));
  } catch {}
}
export const xpNeeded = (level) =>
  Math.round(10 + level * 5 + level * level * 0.35);
export function choices(pool, random = Math.random) {
  return [...pool].sort(() => random() - 0.5).slice(0, 3);
}
