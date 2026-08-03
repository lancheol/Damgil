import { TextStyle } from 'react-native';

import { CoverFontId, Diary, DiaryCover, DiaryPhoto } from '../types/diary';
import { DECOR_FONTS, DECOR_STICKER_EMOJIS, getDecorFontStyle } from './decorAssets';

export const COVER_FONTS = DECOR_FONTS;
export const COVER_STICKER_EMOJIS = DECOR_STICKER_EMOJIS;

export function createEmptyCover(title: string): DiaryCover {
  return {
    coverPhotoId: null,
    title,
    fontId: 'sans',
    stickers: [],
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
  if (source.coverPhotoId) {
    const matched = diary.photos?.find((photo) => photo.id === source.coverPhotoId);
    if (matched?.uri) {
      return matched.uri;
    }
  }
  return getDefaultCoverPhoto(diary)?.uri ?? null;
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
    updatedAt: cover.updatedAt ?? new Date().toISOString(),
  };
}
