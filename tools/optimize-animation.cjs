const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");
(async () => {
  const root = path.resolve(__dirname, ".."),
    m = JSON.parse(
      await fs.readFile(path.join(root, "assets/animation-manifest.json")),
    ),
    b = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
  try {
    const p = await b.newPage();
    await p.goto(process.env.GAME_URL || "http://127.0.0.1:8000");
    for (const s of m.sheets) {
      if (s.key === "auras") continue;
      const png = await p.evaluate(async (s) => {
        const image = await new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = `assets/${s.runtime}?clean=${Date.now()}`;
        });
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const c = canvas.getContext("2d", { willReadFrequently: true });
        c.drawImage(image, 0, 0);
        const data = c.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < data.data.length; i += 4) {
          if (data.data[i + 3] < 144) {
            data.data[i] =
              data.data[i + 1] =
              data.data[i + 2] =
              data.data[i + 3] =
                0;
          } else {
            data.data[i + 3] = 255;
            for (let k = 0; k < 3; k++)
              data.data[i + k] = Math.min(
                255,
                Math.round(data.data[i + k] / 8) * 8,
              );
          }
        }
        c.putImageData(data, 0, 0);
        return canvas.toDataURL();
      }, s);
      await fs.writeFile(
        path.join(root, "assets", s.runtime),
        Buffer.from(png.split(",")[1], "base64"),
      );
    }
    console.log(
      "Quantized character alpha / shade ramps:",
      m.sheets.length - 1,
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
