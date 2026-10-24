export const ENEMY_ART = [
  "saibaman",
  "soldier",
  "guldo",
  "recoome",
  "burter",
  "jeice",
  "ginyu",
  "freeza",
  "freeza2",
];
export const PLAYER_ART = ["goku", "vegeta", "buu", "krillin", "gohan"];
export const PACK_ROWS = { motion: 8, combat: 12, reaction: 12, signature: 4 };
export function enemyArt(e) {
  return e.type === "ginyu"
    ? e.name.toLowerCase()
    : e.type === "freeza" && e.phase === 2
      ? "freeza2"
      : e.type;
}
