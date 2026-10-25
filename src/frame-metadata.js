import { FRAME_DATA } from "./frame-data.js";
import { MOVING_FRAME_DATA, FORM_CAST_DATA, FORM_SIGNATURE_DATA } from "./action-frames.js";
export const ALL_FRAME_DATA = { ...FRAME_DATA, ...MOVING_FRAME_DATA, ...FORM_CAST_DATA, ...FORM_SIGNATURE_DATA };
