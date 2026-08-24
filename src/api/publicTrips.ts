import { apiRequest } from './http';
import type { PublicTripDetailDto, PublicTripListItemDto } from './types';
import { fetchPublicTripCached } from '../utils/publicTripCache';

export function listPublicTrips(query: {
  regionId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<PublicTripListItemDto[]> {
  const params = new URLSearchParams();
  if (query.regionId) params.set('regionId', query.regionId);
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.offset != null) params.set('offset', String(query.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<PublicTripListItemDto[]>(`/public/trips${suffix}`);
}

export function getPublicTrip(tripId: string): Promise<PublicTripDetailDto> {
  return fetchPublicTripCached(tripId);
}
