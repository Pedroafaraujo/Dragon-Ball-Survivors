export class Pool {
  constructor(factory, limit) {
    this.factory = factory;
    this.limit = limit;
    this.free = [];
    this.allocated = 0;
  }
  acquire() {
    if (this.free.length) return this.free.pop();
    if (this.allocated >= this.limit) return null;
    this.allocated++;
    return this.factory();
  }
  release(value) {
    if (value.hit) value.hit.clear();
    this.free.push(value);
  }
}
export function projectilePool(g, hostile = false) {
  const key = hostile ? "hostilePool" : "bulletPool";
  return g[key] || (g[key] = new Pool(() => ({ hit: new Set() }), 180));
}
export function reapProjectiles(g, hostile = false) {
  const items = hostile ? g.hostile : g.bullets,
    pool = projectilePool(g, hostile);
  let write = 0;
  for (const b of items) {
    if (b.t > 0) items[write++] = b;
    else pool.release(b);
  }
  items.length = write;
}
