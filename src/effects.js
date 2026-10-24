import { limits } from "./config.js";
export class Effects {
  constructor() {
    this.items = [];
  }
  burst(x, y, color, count = 10) {
    for (let i = 0; i < count && this.items.length < limits.particles; i++) {
      const a = Math.random() * Math.PI * 2,
        s = 30 + Math.random() * 170;
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        t: 0.35 + Math.random() * 0.4,
        color,
      });
    }
  }
  update(dt) {
    this.items = this.items.filter((p) => (p.t -= dt) > 0);
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  draw(ctx) {
    for (const p of this.items) {
      ctx.globalAlpha = Math.min(1, p.t * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}
