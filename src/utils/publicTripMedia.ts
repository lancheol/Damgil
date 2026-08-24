import { getMediaDisplayUri } from '../api/media';
import type { PublicTripDetailDto } from '../api/types';
import { coverFromStickerLayout } from './feedMapper';
import { mediaKeyFromPhotoId } from './diaryPhotos';

/** 공개 여행 상세에서 표지·타임라인 미디어 URI를 모은다. */
export async function resolvePublicTripMedia(
  detail: PublicTripDetailDto,
  accessToken: string | null,
) {
  const mediaEntries = await Promise.all(
    (detail.items ?? []).map(async (item) => {
      const embedded = item.mediaUrl?.trim() || item.thumbUrl?.trim();
      if (embedded) return [item.id, embedded] as const;
      if (!item.mediaId || !accessToken) return [item.id, null] as const;
      try {
        return [item.id, await getMediaDisplayUri(accessToken, item.mediaId)] as const;
      } catch {
        return [item.id, null] as const;
      }
    }),
  );

  const cover = coverFromStickerLayout(
    detail.title?.trim() || '여행 다이어리',
    detail.coverTitleFont,
    detail.coverStickerLayout,
  );
  const coverMediaIds = new Set<string>();
  const pushMediaId = (photoId: string | null | undefined) => {
    if (!photoId) return;
    const mediaId = mediaKeyFromPhotoId(photoId) ?? (/^\d+$/.test(photoId) ? photoId : null);
    if (mediaId) coverMediaIds.add(mediaId);
  };
  pushMediaId(cover?.coverPhotoId);
  for (const layer of cover?.photos ?? []) {
    pushMediaId(layer.photoId);
  }
  if (detail.coverMediaId) {
    coverMediaIds.add(String(detail.coverMediaId));
  }

  const itemMediaIds = new Set(
    (detail.items ?? []).map((item) => item.mediaId).filter(Boolean) as string[],
  );
  const coverMediaEntries = await Promise.all(
    [...coverMediaIds].map(async (mediaId) => {
      if (mediaId === String(detail.coverMediaId) && detail.coverUrl?.trim()) {
        return [mediaId, detail.coverUrl.trim()] as const;
      }
      if (itemMediaIds.has(mediaId)) {
        const item = (detail.items ?? []).find((row) => row.mediaId === mediaId);
        if (item?.mediaUrl?.trim()) return [mediaId, item.mediaUrl.trim()] as const;
        if (item?.thumbUrl?.trim()) return [mediaId, item.thumbUrl.trim()] as const;
      }
      if (!accessToken) return [mediaId, null] as const;
      try {
        return [mediaId, await getMediaDisplayUri(accessToken, mediaId)] as const;
      } catch {
        return [mediaId, null] as const;
      }
    }),
  );

  return {
    itemUris: Object.fromEntries(mediaEntries) as Record<string, string | null>,
    coverUris: Object.fromEntries(coverMediaEntries) as Record<string, string | null>,
  };
}
