import { apiRequest } from './http';
import { PlaceDetailResponseDto, TourApiResultDto } from './types';

export function searchPlaces(
  query: string,
  options?: { type?: string; rows?: number },
): Promise<TourApiResultDto> {
  const params = new URLSearchParams({ q: query });
  if (options?.type) {
    params.set('type', options.type);
  }
  if (options?.rows != null) {
    params.set('rows', String(options.rows));
  }
  return apiRequest<TourApiResultDto>(`/places/search?${params.toString()}`);
}

export function getPlaceDetail(contentId: string): Promise<PlaceDetailResponseDto> {
  return apiRequest<PlaceDetailResponseDto>(`/places/${encodeURIComponent(contentId)}`);
}
