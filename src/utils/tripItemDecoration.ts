import { TripItemDecorationDto } from '../api/types';
import {
  DecorFontId,
  DecorTextLayer,
  PhotoCropRect,
  PhotoDecoration,
} from '../types/diary';
import { isDecorFontId } from './decorAssets';
import { createTextLayer, buildPhotoDecoration } from './diaryTextLayers';

function asFontId(value: unknown): DecorFontId {
  return isDecorFontId(value) ? value : 'sans';
}

function asTexts(value: unknown): DecorTextLayer[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is DecorTextLayer => {
    return (
      !!item &&
      typeof item === 'object' &&
      typeof (item as DecorTextLayer).id === 'string' &&
      typeof (item as DecorTextLayer).content === 'string'
    );
  });
}

function asCropRect(value: unknown): PhotoCropRect | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const rect = value as Partial<PhotoCropRect>;
  if (
    typeof rect.x !== 'number' ||
    typeof rect.y !== 'number' ||
    typeof rect.width !== 'number' ||
    typeof rect.height !== 'number'
  ) {
    return null;
  }
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/** GET decoration 응답 → 로컬 PhotoDecoration */
export function photoDecorationFromItemDto(dto: TripItemDecorationDto): PhotoDecoration {
  const layout = dto.stickerLayout ?? {};
  let texts = asTexts(layout.texts).map((item) => ({
    ...item,
    fontId: asFontId(item.fontId),
  }));
  const cropRect = asCropRect(layout.cropRect);

  if (texts.length === 0 && dto.textContent?.trim()) {
    texts = [
      createTextLayer(dto.textContent.trim(), asFontId(dto.font), {
        x: 0.5,
        y: 0.72,
      }),
    ];
  }

  const built = buildPhotoDecoration({ texts, cropRect });
  return {
    ...built,
    updatedAt: dto.updatedAt || built.updatedAt,
  };
}
