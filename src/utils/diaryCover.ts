import { TextStyle } from 'react-native';

import { CoverFontId, Diary, DiaryCover, DiaryPhoto } from '../types/diary';
import { DECOR_FONTS, DECOR_STICKER_EMOJIS, getDecorFontStyle } from './decorAssets';

export const COVER_FONTS = DECOR_FONTS;
export const COVER_STICKER_EMOJIS = DECOR_STICKER_EMOJIS;

export const DEFAULT_COVER_COLOR = '#1A1A1A';

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

export function createEmptyCover(title: string): DiaryCover {
  return {
    coverPhotoId: null,
    title,
    fontId: 'sans',
    stickers: [],
    backgroundColor: DEFAULT_COVER_COLOR,
    updatedAt: new Date().toISOString(),
  };
}

export function getEffectiveCover(diary: Diary): DiaryCover {
  if (diary.cover) {
    return diary.cover;
  }
  if (diary.coverDraft) {
    return diary.coverDraft;
  }
  return createEmptyCover(diary.name);
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
    stickers: Array.isArray(cover.stickers) ? cover.stickers : [],
    backgroundColor: cover.backgroundColor?.trim() || DEFAULT_COVER_COLOR,
    updatedAt: cover.updatedAt ?? new Date().toISOString(),
  };
}
