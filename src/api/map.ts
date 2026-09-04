import { apiRequest } from './http';
import type {
  MapPlaceDetailResponseDto,
  MapPlacesResponseDto,
  MapSearchResponseDto,
  PlaceDiariesResponseDto,
  SavedMarkerCategoryCode,
  SavedMarkersResponseDto,
} from './types';

export type SavedMarkersQuery = {
  category?: SavedMarkerCategoryCode[];
};

export type MapPlacesQuery = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  limit?: number;
  category?: SavedMarkerCategoryCode[];
};

export type MapSearchQuery = {
  q: string;
  rows?: number;
  category?: SavedMarkerCategoryCode[];
};

/** GET /map/saved-markers — 좌표가 있는 찜 장소 마커 */
export function getSavedMarkers(
  accessToken: string,
  query: SavedMarkersQuery = {},
): Promise<SavedMarkersResponseDto> {
  const params = new URLSearchParams();
  if (query.category?.length) {
    params.set('category', query.category.join(','));
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<SavedMarkersResponseDto>(`/map/saved-markers${suffix}`, {
    accessToken,
  });
}

/** GET /map/places — 현재 지도 영역(bbox) 장소 */
export function getMapPlaces(
  accessToken: string | null | undefined,
  query: MapPlacesQuery,
): Promise<MapPlacesResponseDto> {
  const params = new URLSearchParams();
  params.set('swLat', String(query.swLat));
  params.set('swLng', String(query.swLng));
  params.set('neLat', String(query.neLat));
  params.set('neLng', String(query.neLng));
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.category?.length) {
    params.set('category', query.category.join(','));
  }
  return apiRequest<MapPlacesResponseDto>(`/map/places?${params.toString()}`, {
    accessToken: accessToken ?? undefined,
  });
}

export type MapPlaceDetailQuery = {
  /** 둘 다 있을 때만 전송 — 하나만 보내면 400 */
  lat?: number | null;
  lng?: number | null;
};

/** GET /map/places/:placeId — 지도 장소 상세 (찜·거리·다이어리 수) */
export function getMapPlaceDetail(
  accessToken: string | null | undefined,
  placeId: string,
  query: MapPlaceDetailQuery = {},
): Promise<MapPlaceDetailResponseDto> {
  const params = new URLSearchParams();
  const hasLat = query.lat != null && Number.isFinite(query.lat);
  const hasLng = query.lng != null && Number.isFinite(query.lng);
  if (hasLat && hasLng) {
    params.set('lat', String(query.lat));
    params.set('lng', String(query.lng));
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<MapPlaceDetailResponseDto>(
    `/map/places/${encodeURIComponent(placeId)}${suffix}`,
    { accessToken: accessToken ?? undefined },
  );
}

/** GET /map/search — 지도 상단 장소 키워드 검색 */
export function searchMapPlaces(
  accessToken: string | null | undefined,
  query: MapSearchQuery,
): Promise<MapSearchResponseDto> {
  const params = new URLSearchParams();
  params.set('q', query.q);
  if (query.rows != null) params.set('rows', String(query.rows));
  if (query.category?.length) {
    params.set('category', query.category.join(','));
  }
  return apiRequest<MapSearchResponseDto>(`/map/search?${params.toString()}`, {
    accessToken: accessToken ?? undefined,
  });
}

export type PlaceDiariesQuery = {
  page?: number;
  pageSize?: number;
};

/** GET /map/places/:placeId/diaries — 해당 장소를 방문한 PUBLIC 완료 다이어리 */
export function getPlaceDiaries(
  accessToken: string | null | undefined,
  placeId: string,
  query: PlaceDiariesQuery = {},
): Promise<PlaceDiariesResponseDto> {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<PlaceDiariesResponseDto>(
    `/map/places/${encodeURIComponent(placeId)}/diaries${suffix}`,
    { accessToken: accessToken ?? undefined },
  );
}
