export const STICKER_SCALE_MIN = 0.5;
export const STICKER_SCALE_MAX = 5;

export function clampStickerScale(scale: number): number {
  return Math.min(STICKER_SCALE_MAX, Math.max(STICKER_SCALE_MIN, scale));
}

export function normalizeRotation(rotation: number): number {
  let next = rotation % 360;
  if (next > 180) {
    next -= 360;
  }
  if (next < -180) {
    next += 360;
  }
  return next;
}
