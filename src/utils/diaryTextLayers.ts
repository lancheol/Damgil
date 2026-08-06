import { DecorFontId, DecorTextLayer, PhotoCropRect, PhotoDecoration } from '../types/diary';
import { createStickerId, DEFAULT_DECOR_TEXT_COLOR } from './decorAssets';

export const FULL_CROP_RECT: PhotoCropRect = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export function normalizeCropRect(crop?: PhotoCropRect | null): PhotoCropRect {
  if (!crop) {
    return { ...FULL_CROP_RECT };
  }
  const width = Math.min(1, Math.max(0.15, crop.width));
  const height = Math.min(1, Math.max(0.15, crop.height));
  const x = Math.min(1 - width, Math.max(0, crop.x));
  const y = Math.min(1 - height, Math.max(0, crop.y));
  return { x, y, width, height };
}

export function isFullCrop(crop?: PhotoCropRect | null): boolean {
  const c = normalizeCropRect(crop);
  return c.x <= 0.001 && c.y <= 0.001 && c.width >= 0.999 && c.height >= 0.999;
}

export function createTextLayerId(prefix = 'text'): string {
  return createStickerId(prefix);
}

export function createTextLayer(
  content: string,
  fontId: DecorFontId = 'sans',
  partial?: Partial<Omit<DecorTextLayer, 'id' | 'content' | 'fontId'>>,
): DecorTextLayer {
  return {
    id: createTextLayerId(),
    content,
    fontId,
    color: partial?.color ?? DEFAULT_DECOR_TEXT_COLOR,
    x: partial?.x ?? 0.5,
    y: partial?.y ?? 0.45,
    scale: partial?.scale ?? 1,
    rotation: partial?.rotation ?? 0,
  };
}

export function deriveNoteFromTexts(texts: DecorTextLayer[]): {
  note: string;
  fontId: DecorFontId;
} {
  const nonempty = texts.map((item) => item.content.trim()).filter(Boolean);
  const first = texts.find((item) => item.content.trim()) ?? texts[0];
  return {
    note: nonempty.join(' · '),
    fontId: first?.fontId ?? 'sans',
  };
}

/** 구버전 note-only decoration → texts 레이어로 승격 */
export function resolveDecorationTexts(
  decoration: Pick<PhotoDecoration, 'texts' | 'note' | 'fontId'> | null | undefined,
): DecorTextLayer[] {
  if (Array.isArray(decoration?.texts) && decoration.texts.length > 0) {
    return decoration.texts.map((item) => ({
      id: item.id || createTextLayerId(),
      content: item.content ?? '',
      fontId: item.fontId ?? 'sans',
      color: item.color ?? DEFAULT_DECOR_TEXT_COLOR,
      x: typeof item.x === 'number' ? item.x : 0.5,
      y: typeof item.y === 'number' ? item.y : 0.72,
      scale: typeof item.scale === 'number' ? item.scale : 1,
      rotation: typeof item.rotation === 'number' ? item.rotation : 0,
    }));
  }

  const legacy = decoration?.note?.trim();
  if (!legacy) {
    return [];
  }

  return [
    {
      id: 'text-legacy',
      content: legacy,
      fontId: decoration?.fontId ?? 'sans',
      color: DEFAULT_DECOR_TEXT_COLOR,
      x: 0.5,
      y: 0.72,
      scale: 1,
      rotation: 0,
    },
  ];
}

export function buildPhotoDecoration(input: {
  stickers: PhotoDecoration['stickers'];
  texts: DecorTextLayer[];
  cropRect?: PhotoCropRect | null;
}): PhotoDecoration {
  const derived = deriveNoteFromTexts(input.texts);
  const cropRect = normalizeCropRect(input.cropRect);
  return {
    stickers: input.stickers,
    texts: input.texts,
    note: derived.note,
    fontId: derived.fontId,
    cropRect: isFullCrop(cropRect) ? null : cropRect,
    updatedAt: new Date().toISOString(),
  };
}
