const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 950 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${process.env.GAME_URL || "http://127.0.0.1:8000"}/?test`);
  await page.click("#start");
  await page.waitForTimeout(800);
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  const moved = await page.evaluate(() => __game.player.x > 1800);
  if (!moved) throw Error("movement failed");
  await page.click("#pause");
  await page.click("#resume");
  await page.evaluate(() => {
    __game.player.xp = 100;
    __game.checkLevel();
  });
  if ((await page.locator("[data-upgrade]").count()) !== 3)
    throw Error("level choices missing");
  await page.click('[data-upgrade="0"]');
  await page.evaluate(() => {
    while (__game.state === "level")
      document.querySelector("[data-upgrade]").click();
    __game.player.level = 30;
  });
  await page.evaluate(async () => {
    const { transform } = await import("./src/transformations.js");
    transform(__game);
    __game.time = 1200;
    __game.player.invuln = 999;
    __game.update(0.01);
  });
  await page.waitForTimeout(500);
  const boss = await page.evaluate(() =>
    __game.enemies.some((e) => e.type === "freeza"),
  );
  if (!boss) throw Error("boss missing");
  await page.evaluate(async () => {
    const { hurt } = await import("./src/enemies.js");
    const boss = __game.enemies.find((e) => e.type === "freeza");
    boss.hp = boss.maxHp * 0.4;
    __game.update(0.01);
    if (boss.phase !== 2) throw Error("phase missing");
    hurt(__game, boss, 999999);
  });
  await page.waitForSelector("#again");
  if (
    !(await page
      .locator("h1")
      .innerText()
      .then((t) => t.includes("superados")))
  )
    throw Error("win screen missing");
  await page.click("#again");
  await page.evaluate(() => {
    __game.player.hp = -1;
    __game.update(0.01);
  });
  await page.waitForFunction(() =>
    document.querySelector("h1")?.textContent.includes("terminou"),
  );
  if (
    !(await page
      .locator("h1")
      .innerText()
      .then((t) => t.includes("terminou")))
  )
    throw Error("lose screen missing");
  await page.click("#menu");
  await page.click('[data-character="3"]');
  await page.click("#start");
  if ((await page.evaluate(() => __game.character.id)) !== "krillin")
    throw Error("selection failed");
  await page.evaluate(() => {
    __game.save.reduced = true;
    localStorage.setItem("db-survivors", JSON.stringify(__game.save));
  });
  await page.reload();
  if (!(await page.isChecked("#reduced")))
    throw Error("settings persistence failed");
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(`${process.env.GAME_URL || "http://127.0.0.1:8000"}/?test`);
  await mobile.click("#start");
  await mobile.dispatchEvent("#game", "pointerdown", {
    pointerId: 1,
    clientX: 90,
    clientY: 650,
    pointerType: "touch",
  });
  await mobile.dispatchEvent("#game", "pointermove", {
    pointerId: 1,
    clientX: 140,
    clientY: 650,
    pointerType: "touch",
  });
  await mobile.waitForTimeout(400);
  if (!(await mobile.evaluate(() => __game.player.x > 1800)))
    throw Error("touch movement failed");
  await mobile.dispatchEvent("#game", "pointerup", { pointerId: 1 });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: desktop movement, pause, upgrade, transformation, boss phases, victory, defeat, character selection, storage and mobile joystick. No browser exceptions.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
