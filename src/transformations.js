export const thresholds = (c) =>
  c.forms.length === 5
    ? [5, 10, 20, 30]
    : c.forms.length === 6
      ? [5, 10, 15, 20, 30]
      : [5, 10, 15, 20, 25, 30];
export function formIndex(c, level) {
  return thresholds(c).filter((n) => level >= n).length;
}
export function appearance(c, index) {
  const form = c.forms[index];
  const colors = {
    SSJ: "#ffe36b",
    SSJ2: "#ffe36b",
    SSJ3: "#ffda4e",
    God: "#ef5269",
    Blue: "#56dafa",
    "Ultra Instinct": "#e4f4fa",
    "Ultra Ego": "#c47aff",
    Beast: "#eee5fa",
    Ultimate: "#17202c",
  };
  return { form, hair: colors[form] || c.hair, aura: colors[form] || c.color };
}
export function transform(g) {
  const p = g.player;
  const next = formIndex(g.character, p.level);
  if (next > p.form) {
    const gained = next - p.form;
    p.form = next;
    if (g.character.id === "buu") p.regen += gained * 0.7;
    if (g.character.id === "krillin")
      p.crit = Math.min(0.8, p.crit + gained * 0.035);
    p.hp = Math.min(p.maxHp, p.hp + 25);
    g.effects.burst(p.x, p.y, appearance(g.character, next).aura, 45);
    g.flash = 0.65;
    g.notice(`${g.character.forms[next]} · PODER DESPERTADO`, 3);
  }
}
