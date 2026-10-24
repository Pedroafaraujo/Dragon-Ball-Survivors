/** Technical texture packing only. Original generated artwork is kept untouched. */
const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(
      `${process.env.GAME_URL || "http://127.0.0.1:8000"}/?raw-assets`,
    );
    const sheets = await page.evaluate(async () => {
      const m = await import("./src/sprites.js");
      await m.ready;
      await Promise.all(
        Object.keys(m.FORM_FILES).map((id) => m.prepareCharacter(id)),
      );
      await Promise.all([
        m.loadSheet("enemies", "sprites/enemies.png", 9, 62),
        m.loadSheet("namek", "tiles/namek.png", 4, 80, false),
        m.loadSheet("effects", "effects/ki.png", 4, 80, false),
      ]);
      const errors = m
        .sheetErrors()
        .filter(
          (message) =>
            !message.includes("animation/") &&
            !message.includes("effects/auras.png"),
        );
      if (errors.length) throw Error(errors.join("\n"));
      const keys = Object.entries(m.FORM_FILES)
        .flatMap(([id, forms]) => forms.map((f) => `${id}-${f}`))
        .concat(["enemies", "namek", "effects"]);
      return keys.map((key) => {
        const s = m.getSheet(key);
        return {
          key,
          file: s.file,
          rows: s.rows,
          frames: s.frames,
          cell: s.cell,
          data: s.image.toDataURL("image/png"),
        };
      });
    });
    const root = path.resolve(__dirname, "../assets");
    const manifest = [];
    for (const { data, ...sheet } of sheets) {
      const output = path.join(root, "packed", sheet.file);
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, Buffer.from(data.split(",")[1], "base64"));
      manifest.push({
        ...sheet,
        runtime: `packed/${sheet.file}`,
        source: `source/${sheet.file}`,
      });
    }
    await fs.writeFile(
      path.join(root, "manifest.json"),
      JSON.stringify(
        {
          version: 1,
          columns: 4,
          directions: ["south", "west", "east", "north"],
          playerFrames: { idle: [0, 2], walk: [1, 2, 3] },
          sheets: manifest,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`Packed ${manifest.length} PNG atlases. Sources unchanged.`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
