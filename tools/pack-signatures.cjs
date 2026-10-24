const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");
(async () => {
  const root = path.resolve(__dirname, ".."),
    b = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
  try {
    const p = await b.newPage();
    await p.goto(process.env.GAME_URL || "http://127.0.0.1:8000");
    const output = await p.evaluate(async () => {
      const load = (url) =>
        new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = url;
        });
      const sources = {
        saiyans: await load("assets/source/animation/signature-saiyans.png"),
        earth: await load("assets/source/animation/signature-earth.png"),
      };
      const specs = [
        ["goku", "saiyans", [0, 2, 1, 3], 82],
        ["vegeta", "saiyans", [4, 5, -6, 6], 66],
        ["gohan", "saiyans", [7, 8, 9, 10], 70],
        ["buu", "earth", [0, 1, -2, 3], 76],
        ["krillin", "earth", [4, 5, -6, 6], 74],
      ];
      const results = [];
      const forms = {
          goku: ["base", "ssj", "ssj2", "ssj3", "god", "blue", "ui"],
          vegeta: ["base", "ssj", "ssj2", "god", "blue", "ue"],
          gohan: ["base", "ssj", "ssj2", "ultimate", "beast"],
          buu: ["base"],
          krillin: ["base"],
        },
        colors = {
          ssj: [255, 227, 107],
          ssj2: [255, 245, 154],
          ssj3: [255, 218, 78],
          god: [239, 82, 105],
          blue: [86, 218, 250],
          ui: [228, 244, 250],
          ue: [196, 122, 255],
          beast: [238, 229, 250],
          ultimate: [23, 32, 44],
        };
      for (const [id, src, mapping, height] of specs) {
        const img = sources[src],
          n = src === "saiyans" ? 11 : 7,
          sc = document.createElement("canvas");
        sc.width = img.width;
        sc.height = img.height;
        const sctx = sc.getContext("2d", { willReadFrequently: true });
        sctx.drawImage(img, 0, 0);
        const px = sctx.getImageData(0, 0, img.width, img.height).data;
        const counts = [];
        for (let y = 0; y < img.height; y++) {
          let count = 0;
          for (let x = Math.floor(img.width * 0.29); x < img.width * 0.47; x++)
            if (px[(y * img.width + x) * 4 + 3] > 145) count++;
          counts.push(count);
        }
        const edges = [0];
        for (let i = 1; i < n; i++) {
          let best = Math.floor((img.height * i) / n),
            score = Infinity;
          const middle = (img.height * i) / n,
            span = (img.height / n) * 0.25;
          for (let y = Math.floor(middle - span); y < middle + span; y++) {
            const s = counts[y] + Math.abs(y - middle) * 0.045;
            if (s < score) {
              score = s;
              best = y;
            }
          }
          edges.push(best);
        }
        edges.push(img.height);
        const rects = [];
        for (let row = 0; row < 4; row++)
          for (let col = 0; col < 4; col++) {
            const raw = mapping[row],
              sr = raw < 0 ? -raw - 1 : raw,
              mirror = raw < 0,
              x0 = Math.round((col * img.width) / 4),
              x1 = Math.round(((col + 1) * img.width) / 4),
              y0 = edges[sr],
              y1 = edges[sr + 1];
            let l = x1,
              r = x0,
              t = y1,
              bt = y0;
            for (let y = y0; y < y1; y++)
              for (let x = x0; x < x1; x++)
                if (px[(y * img.width + x) * 4 + 3] > 90) {
                  l = Math.min(l, x);
                  r = Math.max(r, x);
                  t = Math.min(t, y);
                  bt = Math.max(bt, y);
                }
            rects.push({
              x: l,
              y: t,
              w: r - l + 1,
              h: bt - t + 1,
              row,
              col,
              mirror,
            });
          }
        const scale = Math.min(
            height / Math.max(...rects.map((r) => r.h)),
            88 / Math.max(...rects.map((r) => r.w)),
          ),
          canvas = document.createElement("canvas");
        canvas.width = canvas.height = 384;
        const c = canvas.getContext("2d", { willReadFrequently: true });
        c.imageSmoothingEnabled = false;
        for (const r of rects) {
          const w = Math.round(r.w * scale),
            h = Math.round(r.h * scale),
            x = r.col * 96 + Math.round((96 - w) / 2),
            y = r.row * 96 + 84 - h;
          c.save();
          if (r.mirror) {
            c.translate(x + w, 0);
            c.scale(-1, 1);
            c.drawImage(img, r.x, r.y, r.w, r.h, 0, y, w, h);
          } else c.drawImage(img, r.x, r.y, r.w, r.h, x, y, w, h);
          c.restore();
        }
        for (const form of forms[id]) {
          const out = document.createElement("canvas");
          out.width = out.height = 384;
          const ctx = out.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(canvas, 0, 0);
          if (form !== "base") {
            const data = ctx.getImageData(0, 0, 384, 384),
              color = colors[form];
            for (let y = 0; y < 384; y++)
              for (let x = 0; x < 384; x++) {
                const i = (y * 384 + x) * 4,
                  r = data.data[i],
                  g = data.data[i + 1],
                  b = data.data[i + 2];
                if (
                  y % 96 < 49 &&
                  x % 96 > 22 &&
                  x % 96 < 74 &&
                  Math.max(r, g, b) < 86 &&
                  b >= r * 0.8 &&
                  data.data[i + 3] > 90
                ) {
                  const shade = 0.38 + (Math.max(r, g, b) / 86) * 0.62;
                  for (let channel = 0; channel < 3; channel++)
                    data.data[i + channel] = color[channel] * shade;
                }
              }
            ctx.putImageData(data, 0, 0);
          }
          results.push({
            key:
              form === "base" ? `${id}-signature` : `${id}-${form}-signature`,
            rows: 4,
            data: out.toDataURL(),
            source: `source/animation/signature-${src}.png`,
          });
        }
      }
      // Effect atlas has deliberately distinct aura silhouettes plus beam tips/helix.
      const img = await load("assets/source/effects/auras.png"),
        out = document.createElement("canvas");
      out.width = 384;
      out.height = 768;
      const ctx = out.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 4; col++)
          ctx.drawImage(
            img,
            (col * img.width) / 4,
            (row * img.height) / 8,
            img.width / 4,
            img.height / 8,
            col * 96,
            row * 96,
            96,
            96,
          );
      results.push({
        key: "auras",
        file: "effects/auras.png",
        rows: 8,
        data: out.toDataURL(),
        source: "source/effects/auras.png",
      });
      return results;
    });
    const manifest = JSON.parse(
      await fs.readFile(path.join(root, "assets/animation-manifest.json")),
    );
    for (const item of output) {
      const { data, ...meta } = item,
        file = meta.file || `animation/${meta.key}.png`;
      await fs.writeFile(
        path.join(root, "assets/packed", file),
        Buffer.from(data.split(",")[1], "base64"),
      );
      manifest.sheets = manifest.sheets.filter((s) => s.key !== meta.key);
      manifest.sheets.push({
        ...meta,
        file,
        cell: 96,
        frames: meta.rows * 4,
        ...(meta.key !== "auras"
          ? { anchors: Array.from({ length: 16 }, () => ({ ground: 84 })) }
          : {}),
        runtime: `packed/${file}`,
      });
    }
    await fs.writeFile(
      path.join(root, "assets/animation-manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    console.log("Packed signature/aura atlases:", output.length);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
