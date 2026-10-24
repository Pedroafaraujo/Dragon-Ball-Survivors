export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function move(body, dx, dy, arena, obstacles) {
  const r = body.r;
  for (const axis of ["x", "y"]) {
    body[axis] += axis === "x" ? dx : dy;
    body[axis] = Math.max(
      r,
      Math.min(arena[axis === "x" ? "width" : "height"] - r, body[axis]),
    );
    for (const o of obstacles) {
      const d = distance(body, o),
        min = r + o.r;
      if (d < min) {
        if (d === 0) {
          body.x += min;
          continue;
        }
        const push = (min - d) / d;
        body.x += (body.x - o.x) * push;
        body.y += (body.y - o.y) * push;
      }
    }
  }
}
export function makeObstacles() {
  const out = [];
  for (let i = 0; i < 65; i++) {
    const x = 180 + ((i * 719) % 3200),
      y = 180 + ((i * 431) % 3200);
    if (Math.hypot(x - 1800, y - 1800) > 230)
      out.push({ x, y, r: 20 + (i % 4) * 9 });
  }
  return out;
}
