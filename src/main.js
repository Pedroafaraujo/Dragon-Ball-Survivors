import { characters } from "./characters.js";
import { arenas } from "./config.js";
import { move, makeObstacles, distance } from "./collisions.js";
import { Effects } from "./effects.js";
import { State, loadSave, persist, xpNeeded } from "./states.js";
import { transform } from "./transformations.js";
import { updateEnemies } from "./enemies.js";
import { attack } from "./weapons.js";
import { draw } from "./render.js";
import { UI } from "./ui.js";
import { Input } from "./input.js";
export class Game {
  constructor() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.save = loadSave();
    this.selected = 0;
    this.arena = arenas.namek;
    this.obstacles = makeObstacles();
    this.state = State.MENU;
    this.reset();
    this.player = null;
    this.ui = new UI(this);
    this.input = new Input(this);
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.ui.menu();
    this.last = performance.now();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }
  resize() {
    this.width = innerWidth;
    this.height = innerHeight;
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }
  reset() {
    this.enemies = [];
    this.gems = [];
    this.bullets = [];
    this.hostile = [];
    this.lines = [];
    this.rings = [];
    this.effects = new Effects();
    this.time = 0;
    this.kills = 0;
    this.wave = 0;
    this.spawnClock = 0;
    this.shotClock = 0;
    this.specialClock = 0;
    this.ultimateClock = 0;
    this.bossSpawned = false;
    this.stun = 0;
    this.flash = 0;
    this.message = "";
    this.messageTime = 0;
  }
  start() {
    this.reset();
    this.character = characters[this.selected];
    const c = this.character;
    this.player = {
      x: 1800,
      y: 1800,
      r: 14,
      hp: c.hp,
      maxHp: c.hp,
      speed: c.speed,
      power: 1,
      haste: 1,
      area: 1,
      regen: c.id === "buu" ? 2 : 0,
      crit: c.id === "krillin" ? 0.25 : 0.05,
      magnet: 100,
      level: 1,
      xp: 0,
      form: 0,
      invuln: 1,
    };
    this.state = State.PLAY;
    this.input.reset();
    this.ui.hide();
    document.getElementById("hud").hidden = false;
    this.notice("NAMEK · SOBREVIVE. EVOLUI. TRIUNFA.", 3);
    this.ui.hud();
  }
  damage() {
    return (
      this.character.damage * this.player.power * (1 + this.player.form * 0.24)
    );
  }
  notice(text, duration = 2) {
    this.message = text;
    this.messageTime = duration;
  }
  pause() {
    if (this.state === State.PLAY) {
      this.state = State.PAUSE;
      this.input.reset();
      this.ui.pause();
    } else if (this.state === State.PAUSE) {
      this.state = State.PLAY;
      this.ui.hide();
    }
  }
  checkLevel() {
    const p = this.player;
    if (this.state !== State.PLAY) return;
    if (p.xp >= xpNeeded(p.level)) {
      p.xp -= xpNeeded(p.level);
      p.level++;
      transform(this);
      this.ui.level();
    }
  }
  finish(win) {
    if (this.state !== State.PLAY) return;
    this.state = win ? State.WIN : State.LOSE;
    this.save.best = Math.max(this.save.best, this.time);
    this.save.kills = Math.max(this.save.kills, this.kills);
    persist(this.save);
    this.input.reset();
    this.ui.end(win);
  }
  update(dt) {
    if (this.state !== State.PLAY) return;
    const p = this.player;
    this.time += dt;
    this.stun = Math.max(0, this.stun - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.messageTime -= dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    const v = this.input.vector();
    move(
      p,
      v.x * p.speed * (1 + p.form * 0.035) * dt,
      v.y * p.speed * (1 + p.form * 0.035) * dt,
      this.arena,
      this.obstacles,
    );
    updateEnemies(this, dt);
    if (p.hp <= 0) {
      p.hp = 0;
      this.finish(false);
      this.ui.hud();
      return;
    }
    attack(this, dt);
    if (this.state !== State.PLAY) {
      this.ui.hud();
      return;
    }
    this.enemies = this.enemies.filter(
      (e) => e.hp > 0 && (e.type === "freeza" || distance(e, p) < 2000),
    );
    for (const gem of this.gems) {
      const d = distance(gem, p);
      if (d < p.magnet) {
        const amount = Math.min(d, dt * 450);
        gem.x += ((p.x - gem.x) / (d || 1)) * amount;
        gem.y += ((p.y - gem.y) / (d || 1)) * amount;
      }
      if (distance(gem, p) < 20) {
        p.xp += gem.value;
        gem.collected = true;
      }
    }
    this.gems = this.gems.filter((gem) => !gem.collected);
    this.lines = this.lines.filter((l) => (l.t -= dt) > 0);
    this.rings = this.rings.filter((r) => (r.t -= dt) > 0);
    this.effects.update(dt);
    this.checkLevel();
    this.ui.hud();
  }
  frame(now) {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.update(dt);
    draw(this);
    requestAnimationFrame(this.frame);
  }
}
const game = new Game();
// Opt-in test hook, absent in normal play. No alternative game rules.
if (new URLSearchParams(location.search).has("test")) window.__game = game;
