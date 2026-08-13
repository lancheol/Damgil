import { TripItemDecorationDto } from '../api/types';
import {
  DecorFontId,
  DecorSticker,
  DecorTextLayer,
  PhotoCropRect,
  PhotoDecoration,
} from '../types/diary';
import { createTextLayer, buildPhotoDecoration } from './diaryTextLayers';

const FONT_IDS: DecorFontId[] = ['sans', 'serif', 'mono', 'rounded', 'hand', 'display'];

function asFontId(value: unknown): DecorFontId {
  return FONT_IDS.includes(value as DecorFontId) ? (value as DecorFontId) : 'sans';
}

function asStickers(value: unknown): DecorSticker[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is DecorSticker => {
    return (
      !!item &&
      typeof item === 'object' &&
      typeof (item as DecorSticker).id === 'string' &&
      typeof (item as DecorSticker).emoji === 'string'
    );
  });
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
  let stickers = asStickers(layout.stickers);
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

  const built = buildPhotoDecoration({ stickers, texts, cropRect });
  return {
    ...built,
    updatedAt: dto.updatedAt || built.updatedAt,
  };
}
