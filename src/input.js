export class Input {
  constructor(g) {
    this.keys = new Set();
    this.pointer = null;
    this.dx = 0;
    this.dy = 0;
    const stick = document.getElementById("stick");
    window.addEventListener("keydown", (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      this.keys.add(e.key.toLowerCase());
      if (e.key === "Escape" && !e.repeat) g.pause();
    });
    window.addEventListener("keyup", (e) =>
      this.keys.delete(e.key.toLowerCase()),
    );
    window.addEventListener("blur", () => {
      this.reset();
      if (g.state === "play") g.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.reset();
        if (g.state === "play") g.pause();
      }
    });
    g.canvas.addEventListener("pointerdown", (e) => {
      if (this.pointer !== null || g.state !== "play") return;
      this.pointer = e.pointerId;
      this.origin = { x: e.clientX, y: e.clientY };
      g.canvas.setPointerCapture(e.pointerId);
      stick.hidden = false;
      stick.style.left = `${e.clientX - 55}px`;
      stick.style.top = `${e.clientY - 55}px`;
    });
    g.canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this.pointer) return;
      let x = e.clientX - this.origin.x,
        y = e.clientY - this.origin.y;
      const d = Math.hypot(x, y),
        scale = d > 45 ? 45 / d : 1;
      x *= scale;
      y *= scale;
      this.dx = x / 45;
      this.dy = y / 45;
      stick.firstElementChild.style.transform = `translate(${x}px,${y}px)`;
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      g.canvas.addEventListener(name, (e) => {
        if (e.pointerId === this.pointer) this.reset();
      });
  }
  reset() {
    this.keys.clear();
    this.pointer = null;
    this.dx = this.dy = 0;
    document.getElementById("stick").hidden = true;
  }
  vector() {
    let x =
        this.dx +
        (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
        (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0),
      y =
        this.dy +
        (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) -
        (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
    const d = Math.hypot(x, y);
    if (d > 1) {
      x /= d;
      y /= d;
    }
    return { x, y };
  }
}
