export const arenas = {
  namek: {
    name: "Planeta Namek",
    width: 3600,
    height: 3600,
    duration: 1200,
    tile: 96,
    ground: "#276d63",
    water: "#154b56",
    enemies: ["saibaman", "soldier", "ginyu"],
    boss: "freeza",
  },
};
export const enemyTypes = {
  saibaman: {
    name: "Saibaman",
    hp: 25,
    speed: 75,
    damage: 9,
    xp: 3,
    r: 13,
    color: "#a4cf66",
  },
  soldier: {
    name: "Soldado de Freeza",
    hp: 48,
    speed: 66,
    damage: 13,
    xp: 5,
    r: 15,
    color: "#b4bfd5",
  },
  ginyu: {
    name: "Força Ginyu",
    hp: 115,
    speed: 87,
    damage: 18,
    xp: 12,
    r: 19,
    color: "#b789ca",
  },
  freeza: {
    name: "Freeza",
    hp: 14000,
    speed: 65,
    damage: 25,
    xp: 0,
    r: 34,
    color: "#f0dfef",
  },
};
export const limits = {
  enemies: 180,
  particles: 300,
  projectiles: 180,
  gems: 250,
};
export const upgrades = [
  {
    id: "power",
    name: "Ki amplificado",
    desc: "+20% de dano",
    apply: (p) => (p.power += 0.2),
  },
  {
    id: "haste",
    name: "Ritmo de combate",
    desc: "Ataques 12% mais rápidos",
    apply: (p) => (p.haste = Math.min(3, p.haste + 0.12)),
  },
  {
    id: "speed",
    name: "Passo relâmpago",
    desc: "+12% de velocidade",
    apply: (p) => (p.speed *= 1.12),
  },
  {
    id: "health",
    name: "Vigor saiyajin",
    desc: "+25 de vida máxima e cura 35",
    apply: (p) => {
      p.maxHp += 25;
      p.hp = Math.min(p.maxHp, p.hp + 35);
    },
  },
  {
    id: "magnet",
    name: "Atração de energia",
    desc: "+45% de alcance de recolha",
    apply: (p) => (p.magnet *= 1.45),
  },
  {
    id: "regen",
    name: "Energia vital",
    desc: "Regenera 1,5 de vida por segundo",
    apply: (p) => (p.regen += 1.5),
  },
  {
    id: "area",
    name: "Onda de pressão",
    desc: "+20% de área das técnicas",
    apply: (p) => (p.area += 0.2),
  },
  {
    id: "crit",
    name: "Instinto preciso",
    desc: "+10% de probabilidade de crítico",
    apply: (p) => (p.crit = Math.min(0.8, p.crit + 0.1)),
  },
];

export const ginyuMembers = [
  { name: "Guldo", color: "#92bd75", speed: 62, r: 15 },
  { name: "Recoome", color: "#e7a46d", speed: 72, r: 23 },
  { name: "Burter", color: "#6d9cdb", speed: 115, r: 20 },
  { name: "Jeice", color: "#df777f", speed: 95, r: 18 },
  { name: "Ginyu", color: "#ae7bc7", speed: 88, r: 20 },
];
