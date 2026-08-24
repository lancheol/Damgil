import { getPlaceDetail, searchPlaces } from '../api/places';
import { TourApiPlaceItem } from '../api/types';
import type { MapPlace, MapPlaceCategory } from '../constants/mapPlaces';
import { categoryFromContentTypeId } from './savedMapPlaces';

export type MapLocation = {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  contentTypeId?: string;
  /** TourAPI / PlaceCache contentId — 위치 확정 API에 필요 */
  contentId?: string;
};

/** 맵 카테고리 → TourAPI contentTypeId (검색 type 쿼리) */
export function tourTypeFromMapCategory(
  category: MapPlaceCategory | null,
): string | undefined {
  switch (category) {
    case '음식점':
    case '카페':
      return '39';
    case '문화시설':
      return '14';
    case '쇼핑':
      return '38';
    case '체험':
      return '28';
    case '관광지':
      return '12';
    default:
      return undefined;
  }
}

function parseCoord(value: string | number | undefined | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function readString(item: TourApiPlaceItem, ...keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function toMapLocation(item: TourApiPlaceItem): MapLocation | null {
  const contentId = readString(item, 'contentid', 'contentId');
  const title = readString(item, 'title');
  const latitude = parseCoord(item.mapy);
  const longitude = parseCoord(item.mapx);
  if (!contentId || !title || latitude == null || longitude == null) {
    return null;
  }
  return {
    name: title,
    latitude,
    longitude,
    contentId,
    address: readString(item, 'addr1', 'address') || undefined,
    contentTypeId: readString(item, 'contenttypeid', 'contentTypeId') || undefined,
  };
}

export function mapPlaceFromSearch(location: MapLocation): MapPlace | null {
  const contentId = location.contentId?.trim();
  if (!contentId) {
    return null;
  }
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return null;
  }
  return {
    id: contentId,
    name: location.name.trim() || '장소',
    category: categoryFromContentTypeId(location.contentTypeId),
    address: location.address?.trim() || '',
    distanceKm: 0,
    photoCount: 0,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

/** 키워드로 여행 장소 검색 (TourAPI place_cache) */
export async function searchTravelPlaces(
  query: string,
  options?: { type?: string; rows?: number },
): Promise<MapLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const result = await searchPlaces(trimmed, {
      type: options?.type,
      rows: options?.rows ?? 8,
    });
    const mapped = (result.items ?? [])
      .map(toMapLocation)
      .filter((item): item is MapLocation => item != null);
    return mapped.slice(0, options?.rows ?? 8);
  } catch {
    return [];
  }
}

/** 장소 상세 common.mapy/mapx → 좌표 */
export async function resolvePlaceCoordsByContentId(
  contentId: string,
): Promise<MapLocation | null> {
  const id = contentId.trim();
  if (!id) {
    return null;
  }
  try {
    const detail = await getPlaceDetail(id);
    const common = detail.common ?? {};
    const latitude = parseCoord(
      (common.mapy as string | number | undefined) ??
        (common.mapY as string | number | undefined),
    );
    const longitude = parseCoord(
      (common.mapx as string | number | undefined) ??
        (common.mapX as string | number | undefined),
    );
    const title = String(common.title ?? '').trim();
    const address = String(common.addr1 ?? '').trim();
    const contentTypeId = String(
      common.contenttypeid ?? common.contentTypeId ?? '',
    ).trim();
    if (latitude == null || longitude == null) {
      return null;
    }
    return {
      name: title || '장소',
      latitude,
      longitude,
      contentId: id,
      address: address || undefined,
      contentTypeId: contentTypeId || undefined,
    };
  } catch {
    return null;
  }
}

/** 이름 정확 일치 우선으로 TourAPI 좌표 조회 */
export async function resolvePlaceCoordsByName(name: string): Promise<MapLocation | null> {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '장소' || trimmed === '장소 미지정') {
    return null;
  }
  const results = await searchTravelPlaces(trimmed);
  return results.find((item) => item.name === trimmed) ?? null;
}
