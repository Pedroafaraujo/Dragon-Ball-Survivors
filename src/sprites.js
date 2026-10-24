import { enemyArt, ENEMY_ART, PACK_ROWS } from "./animation-assets.js";
/** PNG presentation layer. It never changes a game entity or its statistics. */
export const FORM_FILES = {
  goku: ["base", "ssj", "ssj2", "ssj3", "god", "blue", "ui"],
  vegeta: ["base", "ssj", "ssj2", "god", "blue", "ue"],
  gohan: ["base", "ssj", "ssj2", "ultimate", "beast"],
  buu: ["base"],
  krillin: ["base"],
};
export const DIRECTIONS = ["south", "west", "east", "north"];
const characterSizes = {
  goku: 66,
  vegeta: 64,
  gohan: 66,
  krillin: 55,
  buu: 58,
};
const cache = new Map();
const loading = new Map();
const failures = new Map();
export const assetStatus = { ready: false, error: "" };
const rawAssets = new URLSearchParams(location.search).has("raw-assets");
const root = new URL(
  rawAssets ? "../assets/source/" : "../assets/packed/",
  import.meta.url,
);
function surface(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
function bounds(pixels, width, x, y, w, h) {
  let left = x + w,
    top = y + h,
    right = x,
    bottom = y,
    found = false;
  for (let py = y; py < y + h; py++)
    for (let px = x; px < x + w; px++) {
      if (pixels[(py * width + px) * 4 + 3] > 48) {
        left = Math.min(left, px);
        right = Math.max(right, px);
        top = Math.min(top, py);
        bottom = Math.max(bottom, py);
        found = true;
      }
    }
  return found
    ? { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
    : null;
}
export function loadSheet(key, file, rows = 4, size = 66, trim = true) {
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (loading.has(key)) return loading.get(key);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        if (
          !rawAssets ||
          file.startsWith("animation/") ||
          file === "effects/auras.png"
        ) {
          if (image.width !== 384 || image.height !== rows * 96)
            throw new Error(`Dimensões inválidas: ${key}`);
          const sheet = { image, cell: 96, rows, file, frames: 4 * rows };
          cache.set(key, sheet);
          failures.delete(key);
          resolve(sheet);
          document.dispatchEvent(
            new CustomEvent("sprite-ready", { detail: key }),
          );
          return;
        }
        const source = surface(image.width, image.height),
          sc = source.getContext("2d", { willReadFrequently: true });
        sc.drawImage(image, 0, 0);
        const pixels = trim
          ? sc.getImageData(0, 0, source.width, source.height).data
          : null;
        const frames = [];
        const rowEdges =
          key === "enemies"
            ? [0, 160, 324, 470, 664, 853, 1043, 1214, 1363, 1536].map((y) =>
                Math.round((y * image.height) / 1536),
              )
            : null;
        for (let row = 0; row < rows; row++)
          for (let col = 0; col < 4; col++) {
            const inset = key === "namek" ? 6 : 0;
            const x = Math.round((col * image.width) / 4) + inset,
              y =
                (rowEdges
                  ? rowEdges[row]
                  : Math.round((row * image.height) / rows)) + inset;
            const w = Math.round(((col + 1) * image.width) / 4) - x - inset,
              h =
                (rowEdges
                  ? rowEdges[row + 1]
                  : Math.round(((row + 1) * image.height) / rows)) -
                y -
                inset;
            const rect = trim
              ? bounds(pixels, image.width, x, y, w, h)
              : { x, y, w, h };
            if (!rect) throw new Error(`Célula vazia: ${key} ${col},${row}`);
            frames.push(rect);
          }
        const cell = 96,
          result = surface(cell * 4, cell * rows),
          ctx = result.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        const scale = size / Math.max(...frames.map((f) => f.h));
        frames.forEach((r, i) => {
          const w = trim ? Math.round(r.w * scale) : cell,
            h = trim ? Math.round(r.h * scale) : cell;
          const dx = (i % 4) * cell + Math.round((cell - w) / 2),
            dy = Math.floor(i / 4) * cell + (trim ? cell - 12 - h : 0);
          ctx.drawImage(image, r.x, r.y, r.w, r.h, dx, dy, w, h);
        });
        const sheet = {
          image: result,
          cell,
          rows,
          file,
          frames: frames.length,
        };
        cache.set(key, sheet);
        failures.delete(key);
        resolve(sheet);
        document.dispatchEvent(
          new CustomEvent("sprite-ready", { detail: key }),
        );
      } catch (error) {
        failures.set(key, error.message);
        reject(error);
      }
    };
    image.onerror = () => {
      const message = `Não foi possível carregar ${file}`;
      failures.set(key, message);
      reject(new Error(message));
    };
    image.src = new URL(file, root).href;
  });
  loading.set(key, promise);
  return promise;
}
export function characterKey(id, form = 0) {
  const forms = FORM_FILES[id];
  return `${id}-${forms[Math.min(form, forms.length - 1)]}`;
}
export function prepareCharacter(id) {
  prepareAnimation(id, 0).catch(() => {});
  return Promise.all(
    FORM_FILES[id].map((suffix) =>
      loadSheet(
        `${id}-${suffix}`,
        `sprites/${id}-${suffix}.png`,
        4,
        characterSizes[id],
      ),
    ),
  );
}
export function getSheet(key) {
  return cache.get(key);
}
export function sheetErrors() {
  return [...failures.values()];
}
export function drawCell(ctx, key, col, row, x, y, width = 96, height = width) {
  const sheet = cache.get(key);
  if (!sheet) return false;
  ctx.drawImage(
    sheet.image,
    col * sheet.cell,
    row * sheet.cell,
    sheet.cell,
    sheet.cell,
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
  );
  return true;
}
export function prepareAnimation(id, form = 0) {
  const suffix = FORM_FILES[id][Math.min(form, FORM_FILES[id].length - 1)];
  return Promise.all(
    Object.entries(PACK_ROWS).map(([kind, rows]) => {
      const key =
        suffix === "base" ? `${id}-${kind}` : `${id}-${suffix}-${kind}`;
      return loadSheet(key, `animation/${key}.png`, rows, 66);
    }),
  );
}
export function prepareEnemy(id) {
  return Promise.all(
    ["motion", "combat"].map((kind) =>
      loadSheet(
        `enemy-${id}-${kind}`,
        `animation/enemy-${id}-${kind}.png`,
        kind === "motion" ? 8 : 12,
        62,
      ),
    ),
  );
}
function poseSheet(id, form, sample) {
  if (sample.pack === "base")
    return {
      key: characterKey(id, form),
      row: DIRECTIONS.indexOf(sample.direction),
      frame: sample.frame,
    };
  const suffix = FORM_FILES[id][Math.min(form, FORM_FILES[id].length - 1)],
    key =
      suffix === "base"
        ? `${id}-${sample.pack}`
        : `${id}-${suffix}-${sample.pack}`;
  if (!cache.has(key) && !loading.has(key))
    prepareAnimation(id, form).catch(() => {});
  return {
    key: cache.has(key) ? key : `${id}-${sample.pack}`,
    row: sample.group + DIRECTIONS.indexOf(sample.direction),
    frame: sample.frame,
  };
}
export function drawFighter(
  ctx,
  c,
  form,
  time,
  direction = "south",
  moving = false,
  anim = null,
) {
  const sampled = anim
    ? anim.sample()
    : {
        state: moving ? "run" : "idle",
        pack: "motion",
        group: moving ? 4 : 0,
        frame: Math.floor(time * (moving ? 9 : 3)) % 4,
        direction,
      };
  const active = poseSheet(c.id, form, sampled);
  ctx.imageSmoothingEnabled = false;
  if (
    anim?.action &&
    anim.motion !== "idle" &&
    ["attack", "charge", "cast", "transform"].includes(sampled.state)
  ) {
    const legs = poseSheet(c.id, form, anim.sample(false));
    ctx.save();
    ctx.beginPath();
    ctx.rect(-48, -6, 96, 36);
    ctx.clip();
    drawCell(ctx, legs.key, legs.frame, legs.row, -48, -66);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(-48, -66, 96, 60);
    ctx.clip();
    drawCell(ctx, active.key, active.frame, active.row, -48, -66);
    ctx.restore();
  } else drawCell(ctx, active.key, active.frame, active.row, -48, -66);
}
export function drawEnemySprite(ctx, e, size = 96) {
  const id = enemyArt(e),
    a = e.anim,
    sample = a
      ? a.sample()
      : {
          state: "idle",
          frame: 0,
          group: 0,
          direction: "south",
          pack: "motion",
        };
  let kind = "motion",
    row = 0,
    frame = sample.frame;
  if (["idle", "walk", "run"].includes(sample.state)) {
    row =
      (sample.state === "idle" ? 0 : 4) + DIRECTIONS.indexOf(sample.direction);
    frame =
      sample.state === "idle" ? sample.frame : Math.floor(sample.phase * 4) % 4;
  } else {
    kind = "combat";
    const group =
      sample.state === "death"
        ? 8
        : ["hurt", "knockback"].includes(sample.state)
          ? 4
          : 0;
    row = group + DIRECTIONS.indexOf(sample.direction);
  }
  const key = `enemy-${id}-${kind}`;
  if (!cache.has(key) && !loading.has(key)) prepareEnemy(id).catch(() => {});
  const y = e.r - size + size * 0.125;
  if (
    a?.action &&
    a.speed > 2 &&
    ["attack", "charge", "cast"].includes(sample.state)
  ) {
    const legs = a.sample(false),
      legRow = 4 + DIRECTIONS.indexOf(legs.direction);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-size / 2, y + size * 0.625, size, size * 0.375);
    ctx.clip();
    drawCell(
      ctx,
      `enemy-${id}-motion`,
      Math.floor(legs.phase * 4) % 4,
      legRow,
      -size / 2,
      y,
      size,
      size,
    );
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(-size / 2, y, size, size * 0.625);
    ctx.clip();
    drawCell(ctx, key, frame, row, -size / 2, y, size, size);
    ctx.restore();
  } else drawCell(ctx, key, frame, row, -size / 2, y, size, size);
}

const tints = new Map();
export function tintedEffect(color) {
  if (tints.has(color)) return tints.get(color);
  const sheet = cache.get("effects");
  if (!sheet) return null;
  const canvas = surface(sheet.image.width, sheet.image.height),
    ctx = canvas.getContext("2d");
  ctx.drawImage(sheet.image, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  tints.set(color, canvas);
  return canvas;
}
export function effect(
  ctx,
  row,
  frame,
  x,
  y,
  width,
  height = width,
  color = null,
) {
  const s = cache.get("effects");
  if (!s) return;
  const image = color ? tintedEffect(color) : s.image;
  ctx.drawImage(
    image,
    Math.max(0, Math.min(3, frame)) * 96,
    row * 96,
    96,
    96,
    Math.round(x - width / 2),
    Math.round(y - height / 2),
    Math.round(width),
    Math.round(height),
  );
}
export function auraEffect(ctx, form, frame, x, y, width, height) {
  const sheet = cache.get("auras");
  if (!sheet) return false;
  const row =
    form === "God"
      ? 1
      : form === "Blue"
        ? 2
        : form === "Ultra Instinct"
          ? 3
          : form === "Ultra Ego"
            ? 4
            : form === "Beast"
              ? 5
              : 0;
  ctx.drawImage(
    sheet.image,
    frame * 96,
    row * 96,
    96,
    96,
    Math.round(x - width / 2),
    Math.round(y - height / 2),
    width,
    height,
  );
  return true;
}
export function beamEffect(ctx, helix, frame, x, y, w, h) {
  const sheet = cache.get("auras");
  if (!sheet) return false;
  ctx.drawImage(
    sheet.image,
    frame * 96,
    (helix ? 7 : 6) * 96,
    96,
    96,
    Math.round(x - w / 2),
    Math.round(y - h / 2),
    w,
    h,
  );
  return true;
}
export const ready = Promise.all([
  ...Object.keys(FORM_FILES).map((id) =>
    loadSheet(`${id}-base`, `sprites/${id}-base.png`, 4, characterSizes[id]),
  ),
  loadSheet("namek", "tiles/namek.png", 4, 80, false),
  loadSheet("effects", "effects/ki.png", 4, 80, false),
  loadSheet("enemies", "sprites/enemies.png", 9, 62),
  ...Object.keys(FORM_FILES).map((id) => prepareAnimation(id, 0)),
  prepareEnemy("saibaman"),
  loadSheet("auras", "effects/auras.png", 8, 80, false),
])
  .then(() => {
    assetStatus.ready = true;
    for (const id of ENEMY_ART) prepareEnemy(id).catch(() => {});
    document.dispatchEvent(new CustomEvent("assets-ready"));
  })
  .catch((error) => {
    assetStatus.error = error.message;
    document.dispatchEvent(new CustomEvent("assets-ready"));
  });
