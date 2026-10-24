const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    const errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(`${process.env.GAME_URL || "http://127.0.0.1:8000"}/?test`);
    await page.waitForFunction(
      () =>
        document.querySelector("#start") &&
        !document.querySelector("#start").disabled,
    );
    const report = await page.evaluate(async () => {
      const m = await import("./src/sprites.js");
      const { characters } = await import("./src/characters.js");
      const { draw } = await import("./src/render.js");
      await Promise.all(characters.map((c) => m.prepareCharacter(c.id)));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext("2d");
      const signatures = [];
      for (const c of characters) {
        const count = c.id === "buu" || c.id === "krillin" ? 1 : c.forms.length;
        for (let form = 0; form < count; form++)
          for (const dir of m.DIRECTIONS) {
            ctx.clearRect(0, 0, 96, 96);
            ctx.save();
            ctx.translate(48, 66);
            m.drawFighter(ctx, c, form, 0, dir, false);
            ctx.restore();
            const a = ctx.getImageData(0, 0, 96, 96).data;
            let visible = 0;
            for (let i = 3; i < a.length; i += 4) if (a[i] > 40) visible++;
            if (visible < 250)
              throw Error(`Missing sprite ${c.id} ${form} ${dir}`);
            signatures.push({ c: c.id, form, dir, png: canvas.toDataURL() });
          }
      }
      for (const c of characters)
        for (const dir of m.DIRECTIONS) {
          const frames = [];
          for (const t of [0, 0.12, 0.24]) {
            ctx.clearRect(0, 0, 96, 96);
            ctx.save();
            ctx.translate(48, 66);
            m.drawFighter(ctx, c, 0, t, dir, true);
            ctx.restore();
            frames.push(canvas.toDataURL());
          }
          if (new Set(frames).size < 3)
            throw Error(`Walk frames duplicated: ${c.id} ${dir}`);
        }
      const states = JSON.stringify({
        player: __game.player,
        enemies: __game.enemies,
        obstacles: __game.obstacles,
        time: __game.time,
        kills: __game.kills,
      });
      for (let i = 0; i < 5; i++) draw(__game);
      if (
        states !==
        JSON.stringify({
          player: __game.player,
          enemies: __game.enemies,
          obstacles: __game.obstacles,
          time: __game.time,
          kills: __game.kills,
        })
      )
        throw Error("Renderer mutated gameplay");
      return {
        views: signatures.length,
        uniqueViews: new Set(signatures.map((s) => s.png)).size,
        errors: m.sheetErrors(),
        loaded: [...Object.entries(m.FORM_FILES)].flatMap(([id, forms]) =>
          forms.map((f) => m.getSheet(`${id}-${f}`).file),
        ).length,
      };
    });
    assert.equal(report.loaded, 20);
    assert.equal(report.views, 80);
    assert.equal(report.uniqueViews, 80);
    assert.deepEqual(report.errors, []);
    assert.ok(
      !requests.some((url) => url.includes("/assets/source/")),
      "source art fetched during normal game",
    );
    assert.deepEqual(errors, []);
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await mobile.goto(
      `${process.env.GAME_URL || "http://127.0.0.1:8000"}/?test`,
    );
    await mobile.click("#start");
    assert.equal(
      await mobile.evaluate(() => __game.ctx.imageSmoothingEnabled),
      false,
    );
    const stress = await mobile.evaluate(async () => {
      const { spawn } = await import("./src/enemies.js");
      __game.player.invuln = 999;
      for (let i = 0; i < 180; i++)
        spawn(__game, ["saibaman", "soldier", "ginyu"][i % 3]);
      for (let i = 0; i < 120; i++) {
        if (__game.state === "level")
          document.querySelector("[data-upgrade]").click();
        __game.update(1 / 60);
      }
      return {
        enemies: __game.enemies.length,
        hp: __game.player.hp,
        dpr: __game.dpr,
      };
    });
    assert.ok(stress.enemies <= 180 && stress.hp > 0);
    assert.equal(stress.dpr, 2);
    console.log(
      "PASS:",
      report.views,
      "distinct character/direction views; all walk frames distinct; 20 form atlases loaded; no source masters fetched; renderer preserves game state; mobile crowd stress passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
