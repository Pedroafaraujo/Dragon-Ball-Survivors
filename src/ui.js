import { characters } from "./characters.js";
import { fighter } from "./render.js";
import { assetStatus, prepareCharacter } from "./sprites.js";
import { State, choices, persist, xpNeeded } from "./states.js";
import { upgrades } from "./config.js";
const $ = (id) => document.getElementById(id);
export class UI {
  constructor(g) {
    this.g = g;
    this.root = $("overlay");
    $("pause").onclick = () => g.pause();
    document.addEventListener("assets-ready", () => this.refreshAssets());
    document.addEventListener("sprite-ready", () => this.portraits());
    this.portraitTimer = setInterval(() => {
      if (g.state === State.MENU) this.portraits();
    }, 160);
  }
  show(html) {
    this.root.hidden = false;
    this.root.innerHTML = html;
  }
  hide() {
    this.root.hidden = true;
  }
  menu() {
    const g = this.g;
    $("hud").hidden = true;
    this.show(
      `<section class="shell"><div class="eyebrow">FAN GAME · SOBREVIVÊNCIA 2D</div><h1 class="brand">DRAGON BALL<br><em>SURVIVORS</em></h1><p class="subtitle">Um planeta. Mil inimigos. Supera os teus limites.<br>Sobrevive em Namek durante 20 minutos e enfrenta Freeza.</p><div class="section-line"><b>01 / ESCOLHE O TEU GUERREIRO</b><span>PLANETA NAMEK ↗</span></div><div class="roster">${characters.map((c, i) => `<button class="card ${g.selected === i ? "selected" : ""}" data-character="${i}" style="--glow:${c.color}55" aria-pressed="${g.selected === i}"><div class="portrait"><canvas data-portrait="${i}" width="160" height="176"></canvas></div><span class="tag">${c.role}</span><h3>${c.name}</h3><p>${c.desc}</p></button>`).join("")}</div><div class="bottom"><div class="meta">WASD ou setas para mover · joystick no ecrã tátil<br>Ataques automáticos · técnicas nos níveis 3 e 8 · evolução a partir do nível 5<br>RECORDE ${Math.floor(g.save.best / 60)}m ${Math.floor(g.save.best % 60)}s · ${g.save.kills} eliminações</div><button class="primary" id="start">ENTRAR EM NAMEK →</button></div><div class="settings"><label><input id="reduced" type="checkbox" ${g.save.reduced ? "checked" : ""}> Menos partículas</label><label><input id="shake" type="checkbox" ${g.save.shake ? "checked" : ""}> Efeitos de câmara</label><span>PIXEL ART ORIGINAL · PNG LOCAIS</span></div></section>`,
    );
    for (const el of this.root.querySelectorAll("[data-character]"))
      el.onclick = () => {
        g.selected = Number(el.dataset.character);
        this.menu();
      };
    this.portraits();
    this.refreshAssets();
    prepareCharacter(characters[g.selected].id).catch(() => {});
    for (const name of ["reduced", "shake"])
      $(name).onchange = (e) => {
        g.save[name] = e.target.checked;
        persist(g.save);
      };
    $("start").onclick = () => g.start();
  }
  refreshAssets() {
    const start = $("start");
    if (!start) return;
    start.disabled = !assetStatus.ready;
    start.textContent = assetStatus.error
      ? "ERRO AO CARREGAR PNG — RECARREGA A PÁGINA"
      : assetStatus.ready
        ? "ENTRAR EM NAMEK →"
        : "A CARREGAR SPRITES…";
    this.portraits();
  }
  portraits() {
    if (this.g.state !== State.MENU) return;
    const time = performance.now() / 1000;
    for (const canvas of this.root.querySelectorAll("[data-portrait]")) {
      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.translate(80, 104);
      ctx.scale(2.1, 2.1);
      fighter(ctx, characters[Number(canvas.dataset.portrait)], 0, time);
    }
  }
  pause() {
    this.show(
      `<section class="panel"><div class="eyebrow">RESPIRA. RECUPERA O FOCO.</div><h1>Combate em pausa</h1><p class="subtitle">A tua jornada em Namek continua quando estiveres pronto.</p><div class="actions"><button class="primary" id="resume">CONTINUAR →</button><button class="secondary" id="restart">Reiniciar</button><button class="secondary" id="menu">Seleção</button></div></section>`,
    );
    $("resume").onclick = () => {
      this.g.state = State.PLAY;
      this.hide();
    };
    $("restart").onclick = () => this.g.start();
    $("menu").onclick = () => {
      this.g.state = State.MENU;
      this.menu();
    };
  }
  level() {
    const g = this.g;
    g.state = State.LEVEL;
    const options = choices(upgrades);
    this.show(
      `<section class="panel"><div class="eyebrow">ENERGIA EM ASCENSÃO · NÍVEL ${g.player.level}</div><h1>Rompe os teus limites.</h1><p class="subtitle">Escolhe uma melhoria. O combate está em pausa.</p><div class="choices">${options.map((u, i) => `<button class="card" data-upgrade="${i}"><span class="tag">${String(i + 1).padStart(2, "0")} / MELHORIA</span><h3>${u.name}</h3><p>${u.desc}</p></button>`).join("")}</div></section>`,
    );
    for (const el of this.root.querySelectorAll("[data-upgrade]"))
      el.onclick = () => {
        options[Number(el.dataset.upgrade)].apply(g.player);
        g.state = State.PLAY;
        this.hide();
        g.checkLevel();
      };
  }
  end(win) {
    const g = this.g;
    this.show(
      `<section class="panel"><div class="eyebrow">${win ? "NAMEK ESTÁ A SALVO" : "CADA QUEDA É UM NOVO COMEÇO"}</div><h1>${win ? "Limites superados." : "O combate terminou."}</h1><p class="subtitle">${g.character.name} · ${g.character.forms[g.player.form]}<br>${Math.floor(g.time / 60)}m ${Math.floor(g.time % 60)}s · Nível ${g.player.level} · ${g.kills} eliminações</p><div class="actions"><button class="primary" id="again">JOGAR NOVAMENTE →</button><button class="secondary" id="menu">Escolher guerreiro</button></div></section>`,
    );
    $("again").onclick = () => g.start();
    $("menu").onclick = () => {
      g.state = State.MENU;
      this.menu();
    };
  }
  hud() {
    const g = this.g,
      p = g.player;
    $("hp").style.width = `${Math.max(0, p.hp / p.maxHp) * 100}%`;
    $("hp").parentElement.setAttribute(
      "aria-label",
      `Vida ${Math.ceil(p.hp)} de ${p.maxHp}`,
    );
    $("xp").style.width = `${(p.xp / xpNeeded(p.level)) * 100}%`;
    $("form").textContent =
      `${g.character.name.toUpperCase()} · ${g.character.forms[p.form]}`;
    $("level").textContent =
      `NV ${p.level} · ${Math.ceil(p.hp)} / ${p.maxHp} HP`;
    $("timer").textContent =
      `${String(Math.floor(g.time / 60)).padStart(2, "0")}:${String(Math.floor(g.time % 60)).padStart(2, "0")}`;
    $("kills").textContent = `${g.kills} ELIMINAÇÕES`;
    $("notice").textContent = g.messageTime > 0 ? g.message : "";
  }
}
