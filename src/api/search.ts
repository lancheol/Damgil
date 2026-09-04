import { apiRequest } from './http';
import type {
  FestivalSearchResponseDto,
  RegionFilterResponseDto,
  RegionSearchResponseDto,
} from './types';

export type RegionSearchQuery = {
  q: string;
  page?: number;
  pageSize?: number;
};

export type FestivalSearchQuery = {
  q: string;
  page?: number;
  pageSize?: number;
  regionId?: string;
  emdName?: string;
};

/** GET /search/regions — 지역·제주 읍면동 키워드 검색 */
export function searchRegions(
  query: RegionSearchQuery,
): Promise<RegionSearchResponseDto> {
  const params = new URLSearchParams();
  params.set('q', query.q);
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  return apiRequest<RegionSearchResponseDto>(`/search/regions?${params.toString()}`);
}

/** GET /search/festivals — 공개 축제·행사 키워드 검색 */
export function searchFestivals(
  query: FestivalSearchQuery,
): Promise<FestivalSearchResponseDto> {
  const params = new URLSearchParams();
  params.set('q', query.q);
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  if (query.regionId) params.set('regionId', query.regionId);
  if (query.emdName) params.set('emdName', query.emdName);
  return apiRequest<FestivalSearchResponseDto>(`/search/festivals?${params.toString()}`);
}

/** GET /search/region-filters — 전국 시·도-시·군·구 트리 */
export function getRegionFilters(): Promise<RegionFilterResponseDto> {
  return apiRequest<RegionFilterResponseDto>('/search/region-filters');
}
