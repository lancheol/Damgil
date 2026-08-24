import { apiRequest } from './http';
import type { FestivalDetailResponseDto, TourApiResultDto } from './types';

export type FestivalListQuery = {
  date?: string;
  areaCode?: string;
  rows?: number;
};

export function listFestivals(
  query: FestivalListQuery = {},
): Promise<TourApiResultDto> {
  const params = new URLSearchParams();
  if (query.date) params.set('date', query.date);
  if (query.areaCode) params.set('areaCode', query.areaCode);
  if (query.rows != null) params.set('rows', String(query.rows));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<TourApiResultDto>(`/festivals${suffix}`);
}

/** GET /festivals/{contentId} — 축제 상세 */
export function getFestivalDetail(contentId: string): Promise<FestivalDetailResponseDto> {
  return apiRequest<FestivalDetailResponseDto>(
    `/festivals/${encodeURIComponent(contentId)}`,
  );
}
