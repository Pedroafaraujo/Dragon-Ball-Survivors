import { FORM_FILES } from "./sprite-layout.js";
import { PACK_ROWS } from "./animation-assets.js";
import { MOVING_FRAME_DATA, FORM_CAST_DATA, FORM_SIGNATURE_DATA } from "./action-frames.js";
/** Only load textures that can actually be drawn, not repeated guard placeholders. */
export function animationTextures(id, form = 0) {
  const suffix = FORM_FILES[id][Math.max(0, Math.min(form, FORM_FILES[id].length - 1))];
  const model = `${id}-${suffix}`, cast = `${model}-cast`, signature = `${model}-signature-cast`;
  const textures = [];
  for (const [kind, rows] of Object.entries(PACK_ROWS)) {
    if (suffix !== "base" && kind === "reaction") continue;
    if (kind === "combat" && FORM_CAST_DATA[cast]) continue;
    if (kind === "signature" && FORM_SIGNATURE_DATA[signature]) continue;
    const key = suffix === "base" ? `${id}-${kind}` : `${model}-${kind}`;
    textures.push({ key, file: `animation/${key}.png`, rows });
  }
  const movingModel = suffix === "base" ? id : model;
  for (const key of Object.keys(MOVING_FRAME_DATA))
    if (key.startsWith(`${movingModel}-moving-`))
      textures.push({ key, file: `moving/${key.replace("-moving-", "-")}.png`, rows: 4 });
  if (FORM_CAST_DATA[cast]) textures.push({ key: cast, file: `form-casts/${model}.png`, rows: 4 });
  if (FORM_SIGNATURE_DATA[signature]) textures.push({ key: signature, file: `form-signatures/${model}.png`, rows: 4 });
  return textures;
}
