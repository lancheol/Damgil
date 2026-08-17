import { apiRequest } from './http';
import type { FeedListQuery, FeedResponseDto } from './types';

export function getPublicFeed(
  accessToken: string,
  query: FeedListQuery = {},
): Promise<FeedResponseDto> {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.area != null) params.set('area', String(query.area));
  if (query.sort) params.set('sort', query.sort);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<FeedResponseDto>(`/feed/public${suffix}`, {
    accessToken,
  });
}
