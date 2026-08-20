import type { FeedItemDto, PublicTripDetailDto } from '../api/types';
import type { Diary, DiaryCover } from '../types/diary';
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
  publishedAt: string | null;
};

function coverFromStickerLayout(
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
    fontId:
      font === 'serif' ||
      font === 'mono' ||
      font === 'rounded' ||
      font === 'hand' ||
      font === 'display'
        ? font
        : 'sans',
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
    publishedAt: item.publishedAt,
  };
}

export function publicTripToDiary(
  trip: PublicTripDetailDto,
  mediaUrisByItemId: Record<string, string | null> = {},
): Diary {
  const title = trip.title?.trim() || '여행 다이어리';
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
    cover: coverFromStickerLayout(title, trip.coverTitleFont, trip.coverStickerLayout),
    coverDraft: null,
    visibility: trip.visibility === 'public' ? 'public' : 'private',
    placesSetupAt: null,
    placeSelections: null,
  };

  return applyTimelineToDiary(
    {
      ...trip,
      items: trip.items ?? [],
      regionIds: trip.regionIds ?? [],
    },
    base,
    mediaUrisByItemId,
  );
}
