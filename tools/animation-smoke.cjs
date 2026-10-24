const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 800 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(`${process.env.GAME_URL || "http://127.0.0.1:8000"}/?test`);
    await page.click("#start");
    const report = await page.evaluate(async () => {
      const { Animator, CLIPS, DIRECTIONS } =
          await import("./src/animation.js"),
        sprites = await import("./src/sprites.js"),
        { characters } = await import("./src/characters.js"),
        { ENEMY_ART } = await import("./src/animation-assets.js"),
        { scheduleCast } = await import("./src/weapons.js"),
        { transform } = await import("./src/transformations.js"),
        { spawn } = await import("./src/enemies.js");
      __game.state = "pause";
      await Promise.all(
        characters.flatMap((c) =>
          sprites.FORM_FILES[c.id].map((_, i) =>
            sprites.prepareAnimation(c.id, i),
          ),
        ),
      );
      await Promise.all(ENEMY_ART.map((id) => sprites.prepareEnemy(id)));
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const ctx = cv.getContext("2d");
      let samples = 0;
      for (const c of characters)
        for (const direction of DIRECTIONS)
          for (const state of Object.keys(CLIPS)) {
            const frames = [];
            for (const phase of [0.02, 0.4, 0.8]) {
              const a = new Animator();
              a.direction = direction;
              if (["walk", "run", "idle"].includes(state)) {
                a.motion = state;
                a.travel = phase;
                a.idleTime = phase * CLIPS.idle.duration;
              } else {
                a.play(state, { direction, force: true });
                a.action.elapsed = a.action.duration * phase;
              }
              ctx.clearRect(0, 0, 128, 128);
              ctx.save();
              ctx.translate(64, 80);
              sprites.drawFighter(ctx, c, 0, 0, direction, false, a);
              ctx.restore();
              const data = ctx.getImageData(0, 0, 128, 128).data;
              let count = 0;
              for (let i = 3; i < data.length; i += 4)
                if (data[i] > 100) count++;
              if (count < 100)
                throw Error(`Missing pose ${c.id} ${state} ${direction}`);
              frames.push(cv.toDataURL());
              samples++;
            }
            if (new Set(frames).size < 2)
              throw Error(`Static animation ${c.id} ${state} ${direction}`);
          }
      for (const id of ENEMY_ART)
        for (const direction of DIRECTIONS)
          for (const state of ["idle", "walk", "attack", "hurt", "death"]) {
            const e = {
              type: id.startsWith("freeza")
                ? "freeza"
                : ["guldo", "recoome", "burter", "jeice", "ginyu"].includes(id)
                  ? "ginyu"
                  : id,
              name: id[0].toUpperCase() + id.slice(1),
              phase: id === "freeza2" ? 2 : 1,
              r: 15,
              anim: new Animator(),
            };
            e.anim.direction = direction;
            const snapshots = [];
            for (const phase of [0.02, 0.8]) {
              if (state === "idle" || state === "walk") {
                e.anim.motion = state;
                e.anim.travel = phase;
                e.anim.idleTime = phase * 1.4;
              } else {
                e.anim.play(state, { force: true, direction });
                e.anim.action.elapsed = e.anim.action.duration * phase;
              }
              ctx.clearRect(0, 0, 128, 128);
              ctx.save();
              ctx.translate(64, 75);
              sprites.drawEnemySprite(ctx, e, 96);
              ctx.restore();
              snapshots.push(cv.toDataURL());
              samples++;
            }
            if (snapshots[0] === snapshots[1])
              throw Error(`Static enemy clip ${id} ${state} ${direction}`);
          }
      const cases = {
        goku: ["kamehameha", "genki"],
        vegeta: ["galick", "bang", "final"],
        gohan: ["masenko", "kamehameha", "cannon"],
        buu: ["elastic", "barrage", "planet"],
        krillin: ["kienzan", "taiyoken", "discs"],
      };
      let attacks = 0;
      for (let index = 0; index < characters.length; index++)
        for (const key of cases[characters[index].id]) {
          __game.selected = index;
          __game.start();
          __game.state = "pause";
          __game.player.level = 8;
          __game.player.invuln = 999;
          __game.spawnClock =
            __game.shotClock =
            __game.specialClock =
            __game.ultimateClock =
              999;
          spawn(__game, "soldier");
          const e = __game.enemies[0];
          e.x = __game.player.x + 180;
          e.y = __game.player.y - 80;
          e.hp = e.maxHp = 1e8;
          const cast = scheduleCast(__game, key, e, 1),
            phases = new Set(),
            start = __game.player.x;
          __game.input.keys.add("d");
          for (let i = 0; i < 135; i++) {
            __game.state = "play";
            __game.update(1 / 60);
            __game.state = "pause";
            phases.add(cast.phase);
          }
          if (!cast.released || phases.size < 5)
            throw Error(`Incomplete technique ${key}`);
          if (__game.player.x <= start + 50)
            throw Error(`Attack blocked movement ${key}`);
          attacks++;
        }
      __game.selected = 0;
      __game.start();
      __game.state = "pause";
      __game.player.level = 5;
      transform(__game);
      if (
        __game.player.anim.action.state !== "transform" ||
        __game.player.anim.formFrom !== 0
      )
        throw Error("Transform pose missing");
      for (let i = 0; i < 60; i++) {
        __game.state = "play";
        __game.update(1 / 60);
        __game.state = "pause";
      }
      if (__game.player.form !== 1) throw Error("Form progression failed");
      __game.player.invuln = 999;
      __game.time = 1200;
      __game.state = "play";
      __game.update(0.01);
      __game.state = "pause";
      const boss = __game.enemies.find((e) => e.type === "freeza");
      boss.hp = boss.maxHp * 0.4;
      boss.attack = 0;
      __game.state = "play";
      __game.update(0.01);
      __game.state = "pause";
      if (boss.phase !== 2 || __game.hostile.length)
        throw Error("Boss anticipation failed");
      for (let i = 0; i < 22; i++) {
        __game.state = "play";
        __game.update(1 / 60);
        __game.state = "pause";
      }
      if (__game.hostile.length !== 16) throw Error("Boss launch missing");
      return { samples, attacks, errors: sprites.sheetErrors() };
    });
    assert.deepEqual(report.errors, []);
    assert.deepEqual(errors, []);
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    mobile.on("pageerror", (e) => errors.push(e.message));
    await mobile.goto(
      `${process.env.GAME_URL || "http://127.0.0.1:8000"}/?test`,
    );
    await mobile.click("#start");
    const touch = await mobile.context().newCDPSession(mobile);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 80, y: 650 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 120, y: 610 }],
    });
    await mobile.waitForTimeout(200);
    const moving = await mobile.evaluate(() => ({
      x: __game.player.x,
      y: __game.player.y,
      state: __game.player.anim.motion,
    }));
    assert.ok(moving.x > 1800 && moving.y < 1800);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await mobile.waitForTimeout(150);
    assert.equal(
      await mobile.evaluate(() => __game.player.anim.motion),
      "idle",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS:",
      report.samples,
      "authored animation samples,",
      report.attacks,
      "complete technique timelines while moving, transformation and Freeza phases, desktop and Android viewport; no missing PNGs or browser exceptions.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
