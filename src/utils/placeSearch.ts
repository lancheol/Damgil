import { getPlaceDetail, searchPlaces } from '../api/places';
import { TourApiPlaceItem } from '../api/types';

export type MapLocation = {
  name: string;
  latitude: number;
  longitude: number;
  /** TourAPI / PlaceCache contentId — 위치 확정 API에 필요 */
  contentId?: string;
};

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

function toMapLocation(item: TourApiPlaceItem): MapLocation | null {
  const contentId = String(item.contentid ?? item.contentId ?? '').trim();
  const title = String(item.title ?? '').trim();
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
  };
}

/** 키워드로 여행 장소 검색 (TourAPI place_cache) */
export async function searchTravelPlaces(query: string): Promise<MapLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const result = await searchPlaces(trimmed, { rows: 8 });
    const mapped = (result.items ?? [])
      .map(toMapLocation)
      .filter((item): item is MapLocation => item != null);
    return mapped.slice(0, 8);
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
    if (latitude == null || longitude == null) {
      return null;
    }
    return {
      name: title || '장소',
      latitude,
      longitude,
      contentId: id,
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
