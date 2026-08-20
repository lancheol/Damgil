import { TextStyle } from 'react-native';

import { clampStickerScale, normalizeRotation } from '../utils/stickerTransform';
import {
  CoverFontId,
  DecorPhotoLayer,
  DecorTextLayer,
  Diary,
  DiaryCover,
  DiaryPhoto,
} from '../types/diary';
import { DECOR_FONTS, DECOR_STICKER_EMOJIS, getDecorFontStyle } from './decorAssets';
import { createPhotoLayerId } from './diaryPageDecoration';
import { normalizeCropRect } from './diaryTextLayers';

export const COVER_FONTS = DECOR_FONTS;
export const COVER_STICKER_EMOJIS = DECOR_STICKER_EMOJIS;

export const COVER_TITLE_LAYER_ID = '__cover_title__';
export const DEFAULT_COVER_COLOR = '#1A1A1A';
export const DEFAULT_COVER_TITLE_X = 0.5;
export const DEFAULT_COVER_TITLE_Y = 0.5;
export const DEFAULT_COVER_TITLE_SCALE = 1;
export const DEFAULT_COVER_TITLE_ROTATION = 0;

export function clampCoverTitleAxis(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(0.92, Math.max(0.08, value));
}

export function clampCoverTitleScale(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_COVER_TITLE_SCALE;
  }
  return clampStickerScale(value);
}

export function clampCoverTitleRotation(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_COVER_TITLE_ROTATION;
  }
  return normalizeRotation(value);
}

/** 표지 배경색 팔레트 (임의) */
export const COVER_COLORS = [
  '#1A1A1A',
  '#2C2C2C',
  '#4A5565',
  '#6B7280',
  '#8B7355',
  '#3F4A3C',
  '#4A3F55',
  '#5C3A3A',
  '#1E3A5F',
  '#F5F5F5',
] as const;

function normalizeCoverPhotos(photos: DecorPhotoLayer[] | undefined): DecorPhotoLayer[] {
  if (!Array.isArray(photos)) {
    return [];
  }
  return photos.map((item) => ({
    id: item.id || createPhotoLayerId(),
    photoId: item.photoId,
    x: typeof item.x === 'number' ? item.x : 0.5,
    y: typeof item.y === 'number' ? item.y : 0.42,
    scale: typeof item.scale === 'number' ? item.scale : 0.72,
    rotation: typeof item.rotation === 'number' ? item.rotation : 0,
    cropRect: item.cropRect ? normalizeCropRect(item.cropRect) : null,
  }));
}

function normalizeCoverTexts(texts: DecorTextLayer[] | undefined): DecorTextLayer[] {
  return Array.isArray(texts) ? texts : [];
}

export function createEmptyCover(title: string): DiaryCover {
  return {
    coverPhotoId: null,
    title,
    fontId: 'sans',
    titleX: DEFAULT_COVER_TITLE_X,
    titleY: DEFAULT_COVER_TITLE_Y,
    titleScale: DEFAULT_COVER_TITLE_SCALE,
    titleRotation: DEFAULT_COVER_TITLE_ROTATION,
    stickers: [],
    photos: [],
    texts: [],
    backgroundColor: DEFAULT_COVER_COLOR,
    updatedAt: new Date().toISOString(),
  };
}

export function getEffectiveCover(diary: Diary | null | undefined): DiaryCover {
  if (!diary) {
    return createEmptyCover('');
  }
  const fallback = diary.name?.trim() || '';
  return (
    normalizeCover(diary.cover, fallback) ??
    normalizeCover(diary.coverDraft, fallback) ??
    createEmptyCover(fallback)
  );
}

export function getDefaultCoverPhoto(diary: Diary): DiaryPhoto | undefined {
  const photos = diary.photos ?? [];
  return photos.find((photo) => (photo.mediaType ?? 'photo') !== 'video') ?? photos[0];
}

export function resolveCoverImageUri(diary: Diary, cover?: DiaryCover | null): string | null {
  const source = cover ?? getEffectiveCover(diary);
  if (!source.coverPhotoId) {
    return null;
  }
  const matched = diary.photos?.find((photo) => photo.id === source.coverPhotoId);
  return matched?.uri ?? null;
}

export function getCoverBackgroundColor(cover?: DiaryCover | null): string {
  return cover?.backgroundColor?.trim() || DEFAULT_COVER_COLOR;
}

export function resolveCoverTitleColor(
  cover: Pick<DiaryCover, 'titleColor' | 'backgroundColor'> | null | undefined,
  backgroundColor?: string,
): string {
  const explicit = cover?.titleColor?.trim();
  if (explicit) {
    return explicit;
  }
  const bg = backgroundColor ?? getCoverBackgroundColor(cover as DiaryCover | null | undefined);
  return getCoverTitleColor(bg);
}

/** 밝은 배경이면 어두운 글자 */
export function getCoverTitleColor(backgroundColor: string): string {
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) {
    return '#FFFFFF';
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? '#111111' : '#FFFFFF';
}

export function getCoverFontStyle(fontId: CoverFontId): TextStyle {
  return getDecorFontStyle(fontId);
}

export function normalizeCover(cover: DiaryCover | null | undefined, fallbackTitle: string): DiaryCover | null {
  if (!cover) {
    return null;
  }
  return {
    coverPhotoId: cover.coverPhotoId ?? null,
    title: cover.title?.trim() || fallbackTitle,
    fontId: cover.fontId ?? 'sans',
    titleX: clampCoverTitleAxis(cover.titleX, DEFAULT_COVER_TITLE_X),
    titleY: clampCoverTitleAxis(cover.titleY, DEFAULT_COVER_TITLE_Y),
    titleScale: clampCoverTitleScale(cover.titleScale),
    titleRotation: clampCoverTitleRotation(cover.titleRotation),
    titleColor:
      typeof cover.titleColor === 'string' && cover.titleColor.trim()
        ? cover.titleColor.trim()
        : undefined,
    stickers: Array.isArray(cover.stickers) ? cover.stickers : [],
    photos: normalizeCoverPhotos(cover.photos),
    texts: normalizeCoverTexts(cover.texts),
    backgroundColor: cover.backgroundColor?.trim() || DEFAULT_COVER_COLOR,
    updatedAt: cover.updatedAt ?? new Date().toISOString(),
  };
}
