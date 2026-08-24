import { apiRequest } from '../api/http';
import type { PublicTripDetailDto } from '../api/types';

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  detail: PublicTripDetailDto;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PublicTripDetailDto>>();

function isFresh(entry: CacheEntry, maxAgeMs: number): boolean {
  return Date.now() - entry.fetchedAt < maxAgeMs;
}

export function getCachedPublicTrip(
  tripId: string,
  maxAgeMs = CACHE_TTL_MS,
): PublicTripDetailDto | null {
  const entry = cache.get(tripId);
  if (!entry || !isFresh(entry, maxAgeMs)) {
    return null;
  }
  return entry.detail;
}

export function primePublicTripCache(tripId: string, detail: PublicTripDetailDto): void {
  cache.set(tripId, { detail, fetchedAt: Date.now() });
}

export function isPublicTripCacheFresh(tripId: string, maxAgeMs: number): boolean {
  const entry = cache.get(tripId);
  return Boolean(entry && isFresh(entry, maxAgeMs));
}

export async function fetchPublicTripCached(tripId: string): Promise<PublicTripDetailDto> {
  const cached = getCachedPublicTrip(tripId);
  if (cached) return cached;

  const pending = inflight.get(tripId);
  if (pending) return pending;

  const request = apiRequest<PublicTripDetailDto>(`/public/trips/${tripId}`)
    .then((detail) => {
      primePublicTripCache(tripId, detail);
      return detail;
    })
    .finally(() => {
      inflight.delete(tripId);
    });

  inflight.set(tripId, request);
  return request;
}
