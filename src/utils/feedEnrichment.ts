import type { FeedItemDto } from '../api/types';
import { feedItemToCard, publicTripToDiary, type FeedDiaryCard } from './feedMapper';
import { fetchPublicTripCached } from './publicTripCache';
import { resolvePublicTripMedia } from './publicTripMedia';
import { runWithConcurrency } from './asyncPool';

type EnrichFeedCardsOptions = {
  concurrency?: number;
  priorityIds?: string[];
  /** 카드 여러 장을 모아 한 번에 반영 (기본 120ms) */
  batchIntervalMs?: number;
  isCancelled?: () => boolean;
  onCardsEnriched: (cards: FeedDiaryCard[]) => void;
};

/** 공개 상세 API로 피드 카드 표지·사진을 순차 보강한다. */
export async function enrichFeedCardsFromPublicTrips(
  items: FeedItemDto[],
  accessToken: string | null,
  options: EnrichFeedCardsOptions,
): Promise<void> {
  if (items.length === 0) return;

  const priority = new Set(options.priorityIds ?? []);
  const ordered = [...items].sort((a, b) => {
    const aPriority = priority.has(a.id) ? 0 : 1;
    const bPriority = priority.has(b.id) ? 0 : 1;
    return aPriority - bPriority;
  });

  const batchIntervalMs = options.batchIntervalMs ?? 120;
  let buffer: FeedDiaryCard[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (buffer.length === 0 || options.isCancelled?.()) {
      buffer = [];
      return;
    }
    const chunk = buffer;
    buffer = [];
    options.onCardsEnriched(chunk);
  };

  const enqueue = (card: FeedDiaryCard) => {
    buffer.push(card);
    if (flushTimer) {
      return;
    }
    flushTimer = setTimeout(flush, batchIntervalMs);
  };

  try {
    await runWithConcurrency(ordered, options.concurrency ?? 3, async (item) => {
      if (options.isCancelled?.()) return;

      try {
        const detail = await fetchPublicTripCached(item.id);
        if (options.isCancelled?.()) return;

        const media = await resolvePublicTripMedia(detail, accessToken);
        const mapped = publicTripToDiary(detail, media.itemUris, media.coverUris);
        const enriched = feedItemToCard(item, detail.coverUrl?.trim() || null, {
          cover: mapped.cover,
          photos: mapped.photos,
        });

        if (!options.isCancelled?.()) {
          enqueue(enriched);
        }
      } catch {
        // 개별 실패는 스텁 유지
      }
    });
  } finally {
    flush();
  }
}
