import { FRAME_DATA } from "./frame-data.js";
import { playerFrame, enemyFrame } from "./sprite-layout.js";
import { enemyArt } from "./animation-assets.js";
/** Deterministic animation clocks. No DOM, drawing or combat rules. */
export const CLIPS = Object.freeze({
  idle: {
    frames: [0, 1, 2, 3],
    duration: 1.4,
    priority: 0,
    loop: true,
    pack: "motion",
    group: 0,
  },
  walk: {
    frames: [1, 2, 3, 2],
    duration: 0.48,
    priority: 1,
    loop: true,
    pack: "base",
    group: 0,
  },
  run: {
    frames: [0, 1, 2, 3],
    duration: 0.4,
    priority: 2,
    loop: true,
    pack: "motion",
    group: 4,
  },
  attack: {
    frames: [0, 1, 2, 3],
    duration: 0.34,
    priority: 3,
    pack: "combat",
    group: 4,
  },
  charge: {
    frames: [0, 1, 2, 3],
    duration: 0.5,
    priority: 4,
    pack: "combat",
    group: 0,
  },
  cast: {
    frames: [1, 2, 3],
    duration: 0.45,
    priority: 5,
    pack: "combat",
    group: 8,
  },
  hurt: {
    frames: [0, 1],
    duration: 0.15,
    priority: 6,
    pack: "reaction",
    group: 0,
  },
  knockback: {
    frames: [2, 3],
    duration: 0.24,
    priority: 7,
    pack: "reaction",
    group: 0,
  },
  transform: {
    frames: [0, 1, 2, 3],
    duration: 0.9,
    priority: 8,
    pack: "reaction",
    group: 4,
  },
  death: {
    frames: [0, 1, 2, 3],
    duration: 0.72,
    priority: 10,
    pack: "reaction",
    group: 8,
  },
});
export const DIRECTIONS = ["south", "west", "east", "north"];
export function facing(dx, dy, previous = "south") {
  if (Math.hypot(dx, dy) < 0.001) return previous;
  // Keep an existing axis on near-diagonals instead of flickering every tick.
  if (Math.abs(dx) > Math.abs(dy) * 1.15) return dx < 0 ? "west" : "east";
  if (Math.abs(dy) > Math.abs(dx) * 1.15) return dy < 0 ? "north" : "south";
  if (previous === "west" || previous === "east")
    return dx < 0 ? "west" : "east";
  return dy < 0 ? "north" : "south";
}
export class Animator {
  constructor() {
    this.direction = "south";
    this.motion = "idle";
    this.travel = 0;
    this.idleTime = 0;
    this.action = null;
    this.speed = 0;
    this.formFrom = null;
    this.changedForm = false;
    this.visualForm = null;
    this.transformation = null;
  }
  play(
    state,
    {
      direction = this.direction,
      duration = CLIPS[state]?.duration,
      priority = CLIPS[state]?.priority,
      token = null,
      force = false,
      signature = false,
      release = null,
      hand = "palm",
      contactTiming = null,
    } = {},
  ) {
    if (!CLIPS[state]) throw Error(`Unknown animation ${state}`);
    if (this.action?.token === token && token !== null) return false;
    if (!force && this.action && this.action.priority > priority) return false;
    if (!force && this.action?.state === "death") return false;
    this.action = {
      state,
      elapsed: 0,
      duration: Math.max(0.001, duration),
      priority,
      direction,
      token,
      signature,
      release,
      hand,
      contactTiming,
    };
    return true;
  }
  motionStep(dx, dy, dt, maxSpeed = 190) {
    this.speed = Math.hypot(dx, dy) / Math.max(dt, 0.00001);
    if (this.speed < 2) {
      if (this.motion !== "idle") this.idleTime = 0;
      this.motion = "idle";
      this.idleTime += dt;
      return;
    }
    this.direction = facing(dx, dy, this.direction);
    // Hysteresis prevents walk/run sheets alternating around the speed threshold.
    this.motion = this.speed > maxSpeed * (this.motion === "run" ? 0.66 : 0.82) ? "run" : "walk";
    this.travel +=
      Math.hypot(dx, dy) / (this.stride || (this.motion === "run" ? 64 : 48));
  }
  beginTransformation(from, to) {
    this.visualForm = from;
    this.formFrom = from;
    this.changedForm = false;
    this.transformation = {
      from,
      to,
      swapAt: 0.56,
      total: 0.86,
      swapped: false,
    };
    this.play("transform", {
      force: true,
      duration: 0.86,
      token: Symbol("transform"),
    });
  }
  transformationView() {
    if (!this.transformation || this.action?.state !== "transform") return null;
    const t = this.action.elapsed,
      m = this.transformation;
    const progress = Math.max(0, Math.min(1, (t - 0.16) / (0.56 - 0.16)));
    return {
      phase:
        t < 0.16
          ? "prepare"
          : !m.swapped
            ? "charge"
            : t < 0.66
              ? "swap"
              : "recover",
      aura: progress,
      flash: m.swapped ? Math.max(0, 1 - Math.abs(t - 0.58) / 0.06) : 0,
      swapped: m.swapped,
    };
  }
  update(dt, formReady = () => true) {
    if (!this.action) return;
    // Combat poses are sampled from the weapon clock, including after a hit reaction.
    if (this.action.source === "combat") return;
    const action = this.action,
      transition = this.transformation;
    if (action.state === "transform" && transition) {
      const next = action.elapsed + dt;
      if (!transition.swapped && next >= transition.swapAt) {
        if (!formReady(transition.to)) {
          action.elapsed = transition.swapAt - 0.00001;
          return;
        }
        transition.swapped = true;
        this.visualForm = transition.to;
        this.changedForm = true;
      }
    }
    action.elapsed += dt;
    if (action.elapsed >= action.duration && action.state !== "death") {
      this.action = null;
      this.formFrom = null;
      this.transformation = null;
    }
  }
  sample(action = true) {
    const a = action ? this.action : null,
      state = a?.state || this.motion,
      def = CLIPS[state];
    const phase = a
      ? Math.min(0.99999, a.elapsed / a.duration)
      : state === "idle"
        ? (this.idleTime / def.duration) % 1
        : this.travel % 1;
    if (a?.combatSample) return a.combatSample;
    if (a?.contactTiming) {
      const { windup, active } = a.contactTiming;
      return {
        state, direction: a.direction, pack: "combat", group: 0, phase,
        frame: a.elapsed < windup * 0.35 ? 0 : a.elapsed < windup ? 1 : a.elapsed < windup + active ? 2 : 3,
      };
    }
    if (state === "transform" && this.transformation) {
      const swapped = this.transformation.swapped;
      return {
        state,
        frame: swapped ? 0 : phase < 0.19 ? 0 : 1,
        direction: a.direction,
        pack: swapped ? "base" : "reaction",
        group: swapped ? 0 : 4,
        phase,
      };
    }
    return {
      state,
      frame: a?.signature
        ? a.release
          ? phase < 0.6
            ? 2
            : 3
          : phase < 0.3
            ? 0
            : 1
        : state === "attack" && a?.release !== null && a?.release !== undefined
          ? a.release
            ? phase < 0.65
              ? 2
              : 3
            : phase < 0.5
              ? 0
              : 1
          : def.frames[
              Math.min(
                def.frames.length - 1,
                Math.floor(phase * def.frames.length),
              )
            ],
      direction: a?.direction || this.direction,
      pack: a?.signature ? "signature" : def.pack,
      group: a?.signature ? 0 : def.group,
      phase,
    };
  }
}
export function animator(entity) {
  return entity.anim || (entity.anim = new Animator());
}
export function animateMotion(entity, oldX, oldY, dt, maxSpeed) {
  animator(entity).motionStep(entity.x - oldX, entity.y - oldY, dt, maxSpeed);
}
export function handAnchor(entity, direction, style = "palm") {
  const sample = entity.anim?.sample();
  if (sample) {
    const pose = entity.type
      ? enemyFrame(enemyArt(entity), sample)
      : entity.spriteId
        ? playerFrame(
            entity.spriteId,
            entity.anim.visualForm ?? entity.form ?? 0,
            sample,
          )
        : null;
    const metadata = pose && FRAME_DATA[pose.key]?.[pose.row * 4 + pose.frame];
    if (metadata) {
      const anchor = style === "forehead" && metadata.length >= 10 ? 8 : style === "overhead" && metadata.length >= 12 ? 10 : 4;
      const hx = metadata[anchor], hy = metadata[anchor + 1];
      if (entity.type) {
        const size =
          entity.type === "freeza" ? 126 : Math.max(67, entity.r * 4.6);
        return {
          x: entity.x + ((hx - 48) * size) / 96,
          y: entity.y + entity.r - size * 0.875 + (hy * size) / 96,
        };
      }
      return { x: entity.x + hx - 48, y: entity.y + hy - 66 };
    }
  }
  const offsets = {
    south: [10, -9],
    north: [-9, -20],
    west: [-22, -14],
    east: [22, -14],
  };
  const [x, y] =
    style === "overhead"
      ? [0, -57]
      : style === "forehead"
        ? {
            south: [0, -26],
            north: [0, -31],
            west: [-12, -30],
            east: [12, -30],
          }[direction] || [0, -31]
        : offsets[direction] || offsets.south;
  return { x: entity.x + x, y: entity.y + y };
}
export function renderPosition(entity, alpha = 1) {
  return {
    x:
      (entity.prevX ?? entity.x) +
      (entity.x - (entity.prevX ?? entity.x)) * alpha,
    y:
      (entity.prevY ?? entity.y) +
      (entity.y - (entity.prevY ?? entity.y)) * alpha,
  };
}
