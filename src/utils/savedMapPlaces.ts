import type { SavedPlaceItemDto } from '../api/types';
import type { MapPlace, MapPlaceCategory } from '../constants/mapPlaces';

/** TourAPI contentTypeId → 지도 카테고리 */
export function categoryFromContentTypeId(
  contentTypeId: string | null | undefined,
): MapPlaceCategory {
  switch (contentTypeId?.trim()) {
    case '39':
      return '음식점';
    case '14':
      return '문화시설';
    case '38':
      return '쇼핑';
    case '28':
      return '체험';
    default:
      return '관광지';
  }
}

export function mapPlaceFromSaved(item: SavedPlaceItemDto): MapPlace | null {
  const lat = item.place?.lat;
  const lng = item.place?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    id: item.contentId,
    name: item.place?.title?.trim() || '찜한 장소',
    category: categoryFromContentTypeId(item.place?.contentTypeId),
    address: item.place?.addr1?.trim() || '',
    distanceKm: 0,
    photoCount: 0,
    latitude: lat,
    longitude: lng,
  };
}
