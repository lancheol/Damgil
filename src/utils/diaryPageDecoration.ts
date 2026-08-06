import type {
  DecorPhotoLayer,
  DecorSticker,
  DecorTextLayer,
  PlacePageDecoration,
} from '../types/diary';
import { createStickerId } from './decorAssets';
import { normalizeCropRect } from './diaryTextLayers';

export function createPhotoLayerId(): string {
  return createStickerId('page-photo');
}

export function createDefaultPhotoLayer(
  photoId: string,
  partial?: Partial<Omit<DecorPhotoLayer, 'id' | 'photoId'>>,
): DecorPhotoLayer {
  return {
    id: createPhotoLayerId(),
    photoId,
    x: partial?.x ?? 0.5,
    y: partial?.y ?? 0.42,
    scale: partial?.scale ?? 0.72,
    rotation: partial?.rotation ?? 0,
    cropRect: partial?.cropRect ?? null,
  };
}

export function normalizePlacePageDecoration(
  decoration: PlacePageDecoration | null | undefined,
  fallbackPhotoId?: string | null,
): PlacePageDecoration {
  const photos = Array.isArray(decoration?.photos)
    ? decoration!.photos.map((item) => ({
        id: item.id || createPhotoLayerId(),
        photoId: item.photoId,
        x: typeof item.x === 'number' ? item.x : 0.5,
        y: typeof item.y === 'number' ? item.y : 0.42,
        scale: typeof item.scale === 'number' ? item.scale : 0.72,
        rotation: typeof item.rotation === 'number' ? item.rotation : 0,
        cropRect: item.cropRect ? normalizeCropRect(item.cropRect) : null,
      }))
    : [];

  const stickers: DecorSticker[] = Array.isArray(decoration?.stickers)
    ? decoration!.stickers
    : [];
  const texts: DecorTextLayer[] = Array.isArray(decoration?.texts) ? decoration!.texts : [];

  if (photos.length === 0 && fallbackPhotoId) {
    photos.push(createDefaultPhotoLayer(fallbackPhotoId));
  }

  return {
    photos,
    stickers,
    texts,
    updatedAt: decoration?.updatedAt ?? new Date().toISOString(),
  };
}

export function buildPlacePageDecoration(input: {
  photos: DecorPhotoLayer[];
  stickers: DecorSticker[];
  texts: DecorTextLayer[];
}): PlacePageDecoration {
  return {
    photos: input.photos,
    stickers: input.stickers,
    texts: input.texts,
    updatedAt: new Date().toISOString(),
  };
}
