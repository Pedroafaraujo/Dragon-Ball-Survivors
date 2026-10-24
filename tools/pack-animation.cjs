/** Pack authored poses; repair source layout, mirror missing side views, bake hair layers. */
const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");
(async () => {
  const root = path.resolve(__dirname, ".."),
    layouts = JSON.parse(
      await fs.readFile(path.join(root, "assets/animation-layouts.json")),
    );
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:8000");
    const manifest = [];
    for (const [key, layout] of Object.entries(layouts)) {
      const packed = await page.evaluate(
        async ({ key, layout }) => {
          const load = (url) =>
            new Promise((resolve, reject) => {
              const i = new Image();
              i.onload = () => resolve(i);
              i.onerror = reject;
              i.src = url;
            });
          const image = await load(`assets/source/animation/${key}.png`),
            source = document.createElement("canvas");
          source.width = image.width;
          source.height = image.height;
          const sc = source.getContext("2d", { willReadFrequently: true });
          sc.drawImage(image, 0, 0);
          const pixels = sc.getImageData(
            0,
            0,
            source.width,
            source.height,
          ).data;
          const kind = key.split("-").at(-1),
            enemy = key.startsWith("enemy-"),
            rows = kind === "motion" ? 8 : 12,
            rects = [];
          const crop = (row, col) => {
            const x = Math.round((col * image.width) / 4),
              right = Math.round(((col + 1) * image.width) / 4),
              top = layout.edges[row],
              bottom = layout.edges[row + 1];
            let l = right,
              r = x,
              t = bottom,
              b = top;
            for (let y = top; y < bottom; y++)
              for (let px = x; px < right; px++)
                if (pixels[(y * image.width + px) * 4 + 3] > 90) {
                  l = Math.min(l, px);
                  r = Math.max(r, px);
                  t = Math.min(t, y);
                  b = Math.max(b, y);
                }
            if (r < l || b < t)
              throw Error(`Empty authored pose ${key} ${row},${col}`);
            return { x: l, y: t, w: r - l + 1, h: b - t + 1 };
          };
          for (let row = 0; row < rows; row++)
            for (let col = 0; col < 4; col++) {
              let sr = row,
                cs = col,
                mirror = false;
              if (kind === "motion" && layout.rows === 7) {
                if (key === "enemy-guldo-motion") {
                  const map = [0, 1, 1, 2, 3, 4, 4, 6];
                  sr = map[row];
                  mirror = row === 2 || row === 6;
                } else {
                  const map = [0, 1, 2, 3, 4, 5, 5, 6];
                  sr = map[row];
                  mirror = row === 6;
                  if (key === "krillin-motion" && row >= 5 && row <= 6)
                    mirror = row === 5;
                }
              }
              if (kind === "reaction" && layout.transpose) {
                const dir = row % 4,
                  group = Math.floor(row / 4);
                cs = dir;
                sr =
                  group === 0
                    ? col
                    : group === 1
                      ? 4 + col
                      : col === 0
                        ? 7
                        : 7 + col;
              } else if (kind === "reaction" && layout.rows === 11) {
                if (row >= 4 && row < 8) {
                  sr = [4, 5, 5, 6][row - 4];
                  mirror = row === 6;
                } else if (row >= 8) sr = row - 1;
              }
              if (kind === "combat" && enemy) {
                if (row >= 4 && row < 8) {
                  sr = [4, 5, 5, 6][row - 4];
                  mirror = row === 6;
                } else if (row >= 8) sr = row - 1;
              }
              rects.push({ ...crop(sr, cs), mirror, row, col });
            }
          const canvas = document.createElement("canvas");
          canvas.width = 384;
          canvas.height = rows * 96;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.imageSmoothingEnabled = false;
          const id = key.split("-")[0],
            height = enemy
              ? 62
              : { goku: 66, vegeta: 64, gohan: 66, buu: 58, krillin: 55 }[id];
          const scale = Math.min(
            height / Math.max(...rects.map((r) => r.h)),
            88 / Math.max(...rects.map((r) => r.w)),
          );
          const anchors = [];
          for (const r of rects) {
            const w = Math.round(r.w * scale),
              h = Math.round(r.h * scale),
              x = r.col * 96 + Math.round((96 - w) / 2),
              y = r.row * 96 + 84 - h;
            ctx.save();
            if (r.mirror) {
              ctx.translate(x + w, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(image, r.x, r.y, r.w, r.h, 0, y, w, h);
            } else ctx.drawImage(image, r.x, r.y, r.w, r.h, x, y, w, h);
            ctx.restore();
            anchors.push({ top: 84 - h, headX: 48, ground: 84 });
          }
          const variants = [{ key, rows, data: canvas.toDataURL(), anchors }];
          if (!enemy) {
            const { FORM_FILES } = await import("./src/sprites.js");
            const colors = {
              ssj: "#ffe36b",
              ssj2: "#fff59a",
              ssj3: "#ffda4e",
              god: "#ef5269",
              blue: "#56dafa",
              ui: "#e4f4fa",
              ue: "#c47aff",
              beast: "#eee5fa",
              ultimate: "#17202c",
            };
            for (const suffix of FORM_FILES[id].slice(1)) {
              const out = document.createElement("canvas");
              out.width = 384;
              out.height = rows * 96;
              const oc = out.getContext("2d", { willReadFrequently: true });
              oc.imageSmoothingEnabled = false;
              oc.drawImage(canvas, 0, 0);
              const data = oc.getImageData(0, 0, out.width, out.height),
                rgb = colors[suffix]
                  .slice(1)
                  .match(/../g)
                  .map((v) => parseInt(v, 16));
              for (let row = 0; row < rows; row++)
                for (let col = 0; col < 4; col++) {
                  const top = anchors[row * 4 + col].top;
                  for (let y = top; y < Math.min(60, top + 24); y++)
                    for (let x = col * 96 + 16; x < col * 96 + 80; x++) {
                      const i = ((row * 96 + y) * 384 + x) * 4;
                      const [r, g, b, a] = data.data.slice(i, i + 4);
                      if (a > 90 && Math.max(r, g, b) < 86 && b >= r * 0.8) {
                        const shade = 0.38 + (Math.max(r, g, b) / 86) * 0.62;
                        data.data[i] = rgb[0] * shade;
                        data.data[i + 1] = rgb[1] * shade;
                        data.data[i + 2] = rgb[2] * shade;
                      }
                    }
                }
              oc.putImageData(data, 0, 0);
              // Extra long SSJ3 / Beast silhouette is a source-art hair layer, not a rotated body.
              if (suffix === "ssj3" || suffix === "beast") {
                const form = await load(
                    `assets/packed/sprites/${id}-${suffix}.png`,
                  ),
                  hc = document.createElement("canvas");
                hc.width = 384;
                hc.height = 384;
                const hctx = hc.getContext("2d", { willReadFrequently: true });
                hctx.drawImage(form, 0, 0);
                const hp = hctx.getImageData(0, 0, 384, 384);
                for (let y = 0; y < 384; y++)
                  for (let x = 0; x < 384; x++) {
                    const i = (y * 384 + x) * 4,
                      r = hp.data[i],
                      g = hp.data[i + 1],
                      b = hp.data[i + 2],
                      localY = y % 96;
                    const hair =
                      localY < 60 &&
                      (suffix === "ssj3"
                        ? r > 100 && g / r > 0.65 && b < 130
                        : Math.min(r, g, b) > 100 &&
                          Math.max(r, g, b) - Math.min(r, g, b) < 55);
                    if (!hair) hp.data[i + 3] = 0;
                  }
                hctx.putImageData(hp, 0, 0);
                const layered = document.createElement("canvas");
                layered.width = 384;
                layered.height = rows * 96;
                const lc = layered.getContext("2d");
                lc.imageSmoothingEnabled = false;
                for (let row = 0; row < rows; row++)
                  for (let col = 0; col < 4; col++) {
                    if (kind === "reaction" && row >= 8) continue;
                    const dir = row % 4,
                      delta = anchors[row * 4 + col].top - 18;
                    lc.drawImage(
                      hc,
                      col * 96,
                      dir * 96,
                      96,
                      64,
                      col * 96,
                      row * 96 + delta,
                      96,
                      64,
                    );
                  }
                lc.drawImage(out, 0, 0);
                oc.clearRect(0, 0, out.width, out.height);
                oc.drawImage(layered, 0, 0);
              }
              variants.push({
                key: `${id}-${suffix}-${kind}`,
                rows,
                data: out.toDataURL(),
                anchors,
              });
            }
          }
          return variants;
        },
        { key, layout },
      );
      for (const s of packed) {
        const file = `animation/${s.key}.png`;
        await fs.writeFile(
          path.join(root, "assets/packed", file),
          Buffer.from(s.data.split(",")[1], "base64"),
        );
        manifest.push({
          key: s.key,
          file,
          rows: s.rows,
          cell: 96,
          frames: s.rows * 4,
          source: `source/animation/${key}.png`,
          runtime: `packed/${file}`,
          anchors: s.anchors,
        });
      }
      console.log("Packed", key, packed.length, "variants");
    }
    await fs.writeFile(
      path.join(root, "assets/animation-manifest.json"),
      JSON.stringify({ version: 1, sheets: manifest }, null, 2) + "\n",
    );
    console.log("Animation atlases:", manifest.length);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
