/** Presentation follows the combat clock. It never schedules or delays damage. */
const signatures = new Set(["genki", "final", "masenko", "kienzan", "discs", "planet"]);
export function castPhase(cast) {
  const { windup, charge, active, recovery } = cast.def;
  const t = cast.elapsed;
  if (t < windup) return { name: "preparation", progress: t / windup };
  if (t < windup + charge)
    return { name: "charge", progress: (t - windup) / charge };
  const released = t - windup - charge;
  if (released < active * 0.3)
    return { name: "launch", progress: released / (active * 0.3) };
  if (released < active)
    return { name: "impact", progress: (released - active * 0.3) / (active * 0.7) };
  return { name: "recovery", progress: Math.min(1, (released - active) / recovery) };
}
export function castPose(cast) {
  const phase = castPhase(cast), signature = signatures.has(cast.key);
  const preparing = phase.name === "preparation", charging = phase.name === "charge";
  const recovering = phase.name === "recovery";
  let pack = signature ? "signature" : "combat", group = 0, frame;
  if (signature) frame = preparing ? 0 : charging ? 1 : recovering ? 3 : 2;
  else if (preparing || charging) {
    group = cast.channel === 0 ? 4 : 0;
    // Authored gathering poses; never show the release before the damage clock.
    frame = preparing ? 0 : Math.min(2, 1 + Math.floor(phase.progress * 2));
  } else {
    group = cast.channel === 0 ? 4 : 8;
    frame = recovering ? 3 : phase.name === "launch" ? 1 : 2;
  }
  if (cast.key === "cannon" && (preparing || charging)) {
    // The authored forehead gathering pose fits this technique; a cupped
    // Kamehameha stance at the waist does not.
    pack = "signature"; group = 0; frame = preparing ? 0 : 1;
  }
  if (cast.key === "taiyoken") {
    pack = "combat"; group = 4;
    frame = preparing ? 0 : charging ? 1 : recovering ? 3 : 2;
  }
  // A short guard at the tail is a real whole-body transition, not alpha blending.
  if (recovering && phase.progress > 0.72) { pack = "motion"; group = 0; frame = 0; }
  return {
    state: preparing ? "attack" : charging ? "charge" : "cast",
    frame, pack, group, direction: cast.direction,
    phase: Math.max(0, Math.min(0.99999, phase.progress)),
    combatPhase: phase.name, technique: cast.key,
  };
}
export function presentCasts(actor, casts) {
  const anim = actor.anim;
  if (!anim || (anim.action && anim.action.source !== "combat" && anim.action.priority >= 6)) return;
  // Stable ownership: an equal/lower channel cannot restart or turn a larger cast.
  let chosen = null;
  for (const cast of casts) {
    const total = cast.def.windup + cast.def.charge + cast.def.active + cast.def.recovery;
    if (cast.elapsed >= total) continue;
    if (!chosen || cast.channel > chosen.channel) chosen = cast;
  }
  const owner = casts.find((cast) => cast.token === anim.action?.token);
  if (owner && ["beam", "helix", "elastic"].includes(owner.def.kind) &&
      ["launch", "impact"].includes(castPhase(owner).name)) chosen = owner;
  if (!chosen) {
    if (anim.action?.source === "combat") anim.action = null;
    return;
  }
  const def = chosen.def, pose = castPose(chosen);
  const action = anim.action?.token === chosen.token ? anim.action : {};
  Object.assign(action, {
    source: "combat", token: chosen.token, state: pose.state,
    priority: 3 + chosen.channel, direction: chosen.direction,
    duration: def.windup + def.charge + def.active + def.recovery,
    elapsed: chosen.elapsed,
    hand: ["preparation", "charge"].includes(pose.combatPhase) ? def.hand || "palm" : "palm",
    combatSample: pose,
  });
  anim.action = action;
}
