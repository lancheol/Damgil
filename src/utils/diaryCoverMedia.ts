import { getMediaDisplayUri } from '../api/media';
import type { Diary, DiaryPhoto } from '../types/diary';
import { getEffectiveCover } from './diaryCover';
import { mediaKeyFromPhotoId } from './diaryPhotos';

function collectCoverPhotoIds(diary: Diary): Set<string> {
  const cover = getEffectiveCover(diary);
  const ids = new Set<string>();
  if (cover.coverPhotoId) ids.add(cover.coverPhotoId);
  for (const layer of cover.photos ?? []) {
    if (layer.photoId) ids.add(layer.photoId);
  }
  return ids;
}

function isCoverRelatedPhoto(photo: DiaryPhoto, coverPhotoIds: Set<string>): boolean {
  if (coverPhotoIds.has(photo.id)) return true;
  const mediaId = photo.mediaId?.trim();
  if (mediaId && coverPhotoIds.has(`media-${mediaId}`)) return true;
  return photo.id.startsWith('media-') && coverPhotoIds.has(photo.id);
}

/** 표지 레이어에 쓰이는 사진 중 URI가 비어 있으면 서버에서 다시 조회한다. */
export async function refreshDiaryCoverPhotoUris(
  diary: Diary,
  accessToken: string | null,
): Promise<DiaryPhoto[]> {
  if (!accessToken) return diary.photos ?? [];

  const coverPhotoIds = collectCoverPhotoIds(diary);
  if (coverPhotoIds.size === 0) return diary.photos ?? [];

  const photos = diary.photos ?? [];
  let changed = false;
  const next = await Promise.all(
    photos.map(async (photo) => {
      if (!isCoverRelatedPhoto(photo, coverPhotoIds)) return photo;
      if (photo.uri?.trim() && !photo.uri.startsWith('http')) {
        return photo;
      }
      const mediaId = photo.mediaId ?? mediaKeyFromPhotoId(photo.id);
      if (!mediaId) return photo;
      if (photo.uri?.trim()) return photo;

      try {
        const uri = await getMediaDisplayUri(accessToken, mediaId);
        if (uri?.trim()) {
          changed = true;
          return { ...photo, uri: uri.trim(), mediaId };
        }
      } catch {
        // ignore
      }
      return photo;
    }),
  );

  return changed ? next : photos;
}
