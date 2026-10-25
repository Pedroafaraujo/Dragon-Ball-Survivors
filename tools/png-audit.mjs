/** Decode and inspect real RGBA pixels; no graphics package or network needed. */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
export function decodeRGBA(file) {
  const png = readFileSync(file);
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
    throw Error("Invalid PNG");
  let width,
    height,
    parts = [];
  for (let i = 8; i < png.length;) {
    const size = png.readUInt32BE(i),
      type = png.toString("ascii", i + 4, i + 8),
      data = png.subarray(i + 8, i + 8 + size);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0)
        throw Error("Only non-interlaced RGBA8 atlases are supported");
    }
    if (type === "IDAT") parts.push(data);
    i += size + 12;
  }
  const raw = inflateSync(Buffer.concat(parts)),
    stride = width * 4,
    pixels = Buffer.alloc(stride * height);
  let pos = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c,
      pa = Math.abs(p - a),
      pb = Math.abs(p - b),
      pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0,
        up = y ? pixels[(y - 1) * stride + x] : 0,
        corner = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? Math.floor((left + up) / 2)
                : filter === 4
                  ? paeth(left, up, corner)
                  : NaN;
      if (!Number.isFinite(predictor)) throw Error("Invalid PNG filter");
      pixels[y * stride + x] = (raw[pos++] + predictor) & 255;
    }
  }
  return { width, height, pixels };
}
export function inspectFrame(image, row, col, cell = 96) {
  const mask = new Uint8Array(cell * cell),
    seen = new Uint8Array(cell * cell),
    queue = new Int32Array(cell * cell);
  let visible = 0,
    border = 0,
    below = 0;
  for (let y = 0; y < cell; y++)
    for (let x = 0; x < cell; x++) {
      const alpha =
        image.pixels[((row * cell + y) * image.width + col * cell + x) * 4 + 3];
      if (alpha >= 144) {
        mask[y * cell + x] = 1;
        visible++;
        if (!x || !y || x === cell - 1 || y === cell - 1) border++;
        if (y >= 84) below++;
      }
    }
  const components = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    let read = 0,
      write = 1,
      area = 0,
      left = cell,
      top = cell,
      right = 0,
      bottom = 0;
    queue[0] = start;
    seen[start] = 1;
    while (read < write) {
      const i = queue[read++],
        x = i % cell,
        y = Math.floor(i / cell);
      area++;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx,
            py = y + dy;
          if (px < 0 || py < 0 || px >= cell || py >= cell) continue;
          const next = py * cell + px;
          if (mask[next] && !seen[next]) {
            seen[next] = 1;
            queue[write++] = next;
          }
        }
    }
    components.push({ area, bounds: [left, top, right, bottom] });
  }
  components.sort((a, b) => b.area - a.area);
  return { visible, components, border, below, bounds: components[0]?.bounds };
}
