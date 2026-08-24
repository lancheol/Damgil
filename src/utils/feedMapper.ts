import type { FeedItemDto, PublicTripDetailDto } from '../api/types';
import type { Diary, DiaryCover, DiaryPhoto } from '../types/diary';
import { isDecorFontId } from './decorAssets';
import { buildPlaceSelections } from './diaryPlaces';
import { mediaKeyFromPhotoId } from './diaryPhotos';
import { applyTimelineToDiary } from './tripItemMapper';
import { toDiaryStatus } from './tripStatus';

export type FeedDiaryCard = {
  id: string;
  userId: string;
  authorNickname: string | null;
  title: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  coverThumbUrl: string | null;
  /** 공개 상세에서 복원한 꾸미기 표지 — 있으면 CoverCanvas로 렌더 */
  cover: DiaryCover | null;
  /** 표지 사진 레이어용 */
  photos: DiaryPhoto[];
  publishedAt: string | null;
};

export function coverFromStickerLayout(
  title: string,
  font: string | null | undefined,
  layout: Record<string, unknown> | null | undefined,
): DiaryCover | null {
  if (!layout && !title) return null;
  const stickers = Array.isArray(layout?.stickers) ? (layout!.stickers as DiaryCover['stickers']) : [];
  const photos = Array.isArray(layout?.photos) ? (layout!.photos as NonNullable<DiaryCover['photos']>) : [];
  const texts = Array.isArray(layout?.texts) ? (layout!.texts as NonNullable<DiaryCover['texts']>) : [];
  return {
    coverPhotoId: typeof layout?.coverPhotoId === 'string' ? layout.coverPhotoId : null,
    title: (typeof layout?.title === 'string' && layout.title.trim()) || title,
    fontId: isDecorFontId(font) ? font : 'sans',
    titleX: typeof layout?.titleX === 'number' ? layout.titleX : 0.5,
    titleY: typeof layout?.titleY === 'number' ? layout.titleY : 0.5,
    titleScale: typeof layout?.titleScale === 'number' ? layout.titleScale : 1,
    titleRotation: typeof layout?.titleRotation === 'number' ? layout.titleRotation : 0,
    titleColor: typeof layout?.titleColor === 'string' ? layout.titleColor : undefined,
    stickers,
    photos,
    texts,
    backgroundColor:
      typeof layout?.backgroundColor === 'string' ? layout.backgroundColor : '#1A1A1A',
    updatedAt: new Date().toISOString(),
  };
}

export function feedItemToCard(
  item: FeedItemDto,
  coverThumbUrl: string | null = null,
  extras: { cover?: DiaryCover | null; photos?: DiaryPhoto[] } = {},
): FeedDiaryCard {
  return {
    id: item.id,
    userId: item.userId,
    authorNickname: item.authorNickname,
    title: item.title?.trim() || '여행 다이어리',
    likeCount: item.likeCount ?? 0,
    commentCount: item.commentCount ?? 0,
    liked: Boolean(item.liked),
    coverThumbUrl,
    cover: extras.cover ?? null,
    photos: extras.photos ?? [],
    publishedAt: item.publishedAt,
  };
}

/** 피드 카드용 Diary 스텁 — CoverThumb가 꾸미기 표지를 그릴 수 있게 */
export function feedCardToDiaryStub(card: FeedDiaryCard): Diary {
  const title = card.title;
  return {
    id: card.id,
    name: title,
    place: '',
    createdAt: card.publishedAt ?? new Date().toISOString(),
    endedAt: card.publishedAt,
    status: 'completed',
    editStatus: 'COMPLETED',
    likeCount: card.likeCount,
    commentCount: card.commentCount,
    liked: card.liked,
    coverThumbUrl: card.coverThumbUrl,
    photos: card.photos,
    cover:
      card.cover ??
      ({
        coverPhotoId: null,
        title,
        fontId: 'sans',
        stickers: [],
        photos: [],
        texts: [],
        backgroundColor: '#1A1A1A',
        updatedAt: new Date().toISOString(),
      } satisfies DiaryCover),
    coverDraft: null,
    visibility: 'public',
  };
}

/** 피드 재로드 시 URI가 더 많이 채워진 쪽의 표지·사진 데이터를 유지한다. */
export function mergeFeedCardMedia(
  next: FeedDiaryCard,
  prev: FeedDiaryCard | undefined,
): FeedDiaryCard {
  if (!prev) return next;

  const countResolved = (photos: DiaryPhoto[]) =>
    photos.filter((photo) => Boolean(photo.uri?.trim())).length;

  const prevResolved = countResolved(prev.photos);
  const nextResolved = countResolved(next.photos);
  const prevHasLayout = Boolean(
    prev.cover?.photos?.length ||
      prev.cover?.stickers?.length ||
      prev.cover?.texts?.length,
  );
  const nextHasLayout = Boolean(
    next.cover?.photos?.length ||
      next.cover?.stickers?.length ||
      next.cover?.texts?.length,
  );

  if (nextResolved >= prevResolved && (!prevHasLayout || nextHasLayout)) {
    return next;
  }

  return {
    ...next,
    cover: prev.cover ?? next.cover,
    photos: prevResolved > nextResolved ? prev.photos : next.photos,
    coverThumbUrl: next.coverThumbUrl ?? prev.coverThumbUrl,
  };
}

export function publicTripToDiary(
  trip: PublicTripDetailDto,
  mediaUrisByItemId: Record<string, string | null> = {},
  coverMediaUris: Record<string, string | null> = {},
): Diary {
  const title = trip.title?.trim() || '여행 다이어리';
  const cover = coverFromStickerLayout(title, trip.coverTitleFont, trip.coverStickerLayout);
  const base: Diary = {
    id: trip.id,
    name: title,
    place: '',
    createdAt: trip.startedAt,
    endedAt: trip.endedAt,
    status: toDiaryStatus(trip.status),
    editStatus: 'COMPLETED',
    likeCount: trip.likeCount ?? 0,
    commentCount: trip.commentCount ?? 0,
    coverThumbUrl: trip.coverUrl ?? null,
    photos: [],
    cover,
    coverDraft: null,
    visibility: trip.visibility === 'public' ? 'public' : 'private',
    placesSetupAt: null,
    placeSelections: null,
  };

  const withItems = applyTimelineToDiary(
    {
      ...trip,
      items: trip.items ?? [],
      regionIds: trip.regionIds ?? [],
    },
    base,
    mediaUrisByItemId,
  );

  const coverPhotoIds = new Set<string>();
  if (cover?.coverPhotoId) coverPhotoIds.add(cover.coverPhotoId);
  for (const layer of cover?.photos ?? []) {
    if (layer.photoId) coverPhotoIds.add(layer.photoId);
  }

  const existing = new Set(withItems.photos.map((photo) => photo.id));
  for (const photo of withItems.photos) {
    if (photo.mediaId) existing.add(`media-${photo.mediaId}`);
  }

  const coverExtras: DiaryPhoto[] = [];
  for (const photoId of coverPhotoIds) {
    if (existing.has(photoId)) continue;
    const mediaId = mediaKeyFromPhotoId(photoId);
    const uri =
      (mediaId ? coverMediaUris[mediaId] : null) ||
      mediaUrisByItemId[photoId] ||
      (mediaId && mediaId === String(trip.coverMediaId) ? trip.coverUrl : null) ||
      coverMediaUris[photoId] ||
      '';
    coverExtras.push({
      id: photoId,
      uri: uri?.trim() || '',
      mediaType: 'photo',
      mediaId,
      placeName: null,
      note: '',
      latitude: 0,
      longitude: 0,
      placeContentId: null,
      createdAt: trip.publishedAt ?? trip.createdAt,
      decoration: null,
    });
  }

  const photos = [...withItems.photos, ...coverExtras];
  // 타임라인/장소는 여행 기록만 — 표지 전용 media는 photoById용으로만 합침
  const selections = buildPlaceSelections(withItems.photos);

  return {
    ...withItems,
    photos,
    placeSelections: selections.length > 0 ? selections : null,
    placesSetupAt: selections.length > 0 ? new Date().toISOString() : null,
  };
}
