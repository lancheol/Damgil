import type { DiaryPhoto } from '../types/diary';

/** 표지/페이지 레이어 photoId가 item id 또는 media-{mediaId} 둘 다일 수 있음 */
export function indexPhotosById(
  photos: DiaryPhoto[] | null | undefined,
): Record<string, DiaryPhoto | undefined> {
  const map: Record<string, DiaryPhoto | undefined> = {};
  for (const photo of photos ?? []) {
    map[photo.id] = photo;
    const mediaId = photo.mediaId?.trim();
    if (mediaId) {
      map[`media-${mediaId}`] = photo;
    }
  }
  return map;
}

export function mediaKeyFromPhotoId(photoId: string): string | null {
  const match = /^media-(.+)$/.exec(photoId.trim());
  return match?.[1] ?? null;
}

export function sameMediaRef(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  return a.trim() === b.trim();
}

/** 에디터 mediaId ↔ diary.photos 매칭 (타입·media- 접두 혼용) */
export function findPhotoByMediaRef(
  photos: DiaryPhoto[],
  mediaId: string | null | undefined,
): DiaryPhoto | undefined {
  if (!mediaId?.trim()) return undefined;
  const key = mediaId.trim();
  return photos.find(
    (photo) =>
      sameMediaRef(photo.mediaId, key) ||
      photo.id === key ||
      photo.id === `media-${key}`,
  );
}

/** 게스트/공개 다이어리 재동기화 시 이미 받아 둔 URI·표지 전용 사진을 유지 */
export function mergeDiaryPhotosPreservingUris(
  prev: DiaryPhoto[],
  next: DiaryPhoto[],
): DiaryPhoto[] {
  const prevById = new Map(prev.map((photo) => [photo.id, photo]));
  const prevByMedia = new Map<string, DiaryPhoto>();
  for (const photo of prev) {
    const mediaId = photo.mediaId?.trim();
    if (mediaId) prevByMedia.set(mediaId, photo);
  }

  const merged = next.map((photo) => {
    const fallback =
      prevById.get(photo.id) ??
      (photo.mediaId?.trim() ? prevByMedia.get(photo.mediaId.trim()) : undefined);
    if (photo.uri?.trim() || !fallback?.uri?.trim()) {
      return photo;
    }
    return { ...photo, uri: fallback.uri };
  });

  const mergedIds = new Set(merged.map((photo) => photo.id));
  for (const photo of prev) {
    if (!mergedIds.has(photo.id)) {
      merged.push(photo);
    }
  }

  return merged.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
