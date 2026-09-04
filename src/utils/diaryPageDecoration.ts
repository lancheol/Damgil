import type {
  DecorPhotoLayer,
  DecorTextLayer,
  PlacePageDecoration,
} from '../types/diary';
import { createStickerId } from './decorAssets';
import { ensureDecorLayerZIndexes, normalizeDecorLayerBundle } from './decorLayerOrder';
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
    zIndex: partial?.zIndex,
  };
}

export function normalizePlacePageDecoration(
  decoration: PlacePageDecoration | null | undefined,
  fallbackPhotoId?: string | null,
  fallbackPhotoIds?: string[] | null,
): PlacePageDecoration {
  const photos: DecorPhotoLayer[] = Array.isArray(decoration?.photos)
    ? decoration!.photos.map((item) => ({
        id: item.id || createPhotoLayerId(),
        photoId: item.photoId,
        x: typeof item.x === 'number' ? item.x : 0.5,
        y: typeof item.y === 'number' ? item.y : 0.42,
        scale: typeof item.scale === 'number' ? item.scale : 0.72,
        rotation: typeof item.rotation === 'number' ? item.rotation : 0,
        cropRect: item.cropRect ? normalizeCropRect(item.cropRect) : null,
        zIndex: typeof item.zIndex === 'number' ? item.zIndex : undefined,
      }))
    : [];

  const texts: DecorTextLayer[] = Array.isArray(decoration?.texts)
    ? decoration!.texts.map((item) => ({
        ...item,
        zIndex: typeof item.zIndex === 'number' ? item.zIndex : undefined,
      }))
    : [];

  if (photos.length === 0) {
    const ids =
      fallbackPhotoIds?.filter(Boolean).length
        ? [...new Set(fallbackPhotoIds!.filter(Boolean))]
        : fallbackPhotoId
          ? [fallbackPhotoId]
          : [];
    ids.forEach((photoId, index) => {
      photos.push(
        createDefaultPhotoLayer(photoId, {
          x: 0.5 + (index - (ids.length - 1) / 2) * 0.12,
          y: 0.42 + index * 0.04,
        }),
      );
    });
  }

  const ensured = ensureDecorLayerZIndexes({ photos, stickers: [], texts });

  return {
    photos: ensured.photos,
    stickers: [],
    texts: ensured.texts,
    updatedAt: decoration?.updatedAt ?? new Date().toISOString(),
  };
}

export function buildPlacePageDecoration(input: {
  photos: DecorPhotoLayer[];
  texts: DecorTextLayer[];
}): PlacePageDecoration {
  const normalized = normalizeDecorLayerBundle({
    photos: input.photos,
    stickers: [],
    texts: input.texts,
  });
  return {
    photos: normalized.photos,
    stickers: [],
    texts: normalized.texts,
    updatedAt: new Date().toISOString(),
  };
}
