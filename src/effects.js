import { limits } from "./config.js";
import { Pool } from "./pool.js";
export class Effects {
  constructor() {
    this.items = [];
    this.pool = new Pool(() => ({}), limits.particles);
  }
  burst(x, y, color, count = 10) {
    for (let i = 0; i < count && this.items.length < limits.particles; i++) {
      const p = this.pool.acquire();
      if (!p) break;
      const a = Math.random() * Math.PI * 2,
        s = 30 + Math.random() * 170;
      Object.assign(p, {
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        t: 0.35 + Math.random() * 0.4,
        color,
      });
      this.items.push(p);
    }
  }
  update(dt) {
    let write = 0;
    for (const p of this.items) {
      p.t -= dt;
      if (p.t <= 0) {
        this.pool.release(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-3 * dt);
      p.vy *= Math.exp(-3 * dt);
      this.items[write++] = p;
    }
    this.items.length = write;
  }
  draw(ctx) {
    for (const p of this.items) {
      ctx.globalAlpha = Math.min(1, p.t * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}
