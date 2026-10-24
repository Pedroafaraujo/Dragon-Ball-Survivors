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
        if (!rawAssets) {
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
export function drawFighter(
  ctx,
  c,
  form,
  time,
  direction = "south",
  moving = false,
) {
  const key = characterKey(c.id, form);
  if (!cache.has(key) && !loading.has(key))
    loadSheet(key, `sprites/${key}.png`, 4, characterSizes[c.id]).catch(
      () => {},
    );
  const frame = moving
    ? 1 + (Math.floor(time * 9) % 3)
    : Math.floor(time * 1.6) % 2 === 0
      ? 0
      : 2;
  const bob = moving ? 0 : Math.sin(time * 2.7) > 0.65 ? -1 : 0;
  ctx.imageSmoothingEnabled = false;
  drawCell(
    ctx,
    cache.has(key) ? key : `${c.id}-base`,
    frame,
    Math.max(0, DIRECTIONS.indexOf(direction)),
    -48,
    -66 + bob,
  );
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
export const ready = Promise.all([
  ...Object.keys(FORM_FILES).map((id) =>
    loadSheet(`${id}-base`, `sprites/${id}-base.png`, 4, characterSizes[id]),
  ),
  loadSheet("namek", "tiles/namek.png", 4, 80, false),
  loadSheet("effects", "effects/ki.png", 4, 80, false),
  loadSheet("enemies", "sprites/enemies.png", 9, 62),
])
  .then(() => {
    assetStatus.ready = true;
    document.dispatchEvent(new CustomEvent("assets-ready"));
  })
  .catch((error) => {
    assetStatus.error = error.message;
    document.dispatchEvent(new CustomEvent("assets-ready"));
  });
