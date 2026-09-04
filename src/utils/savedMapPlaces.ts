import type { SavedMarkerCategoryCode, SavedMarkerItemDto, SavedPlaceItemDto } from '../api/types';
import type { MapPlace, MapPlaceCategory } from '../constants/mapPlaces';
import type { MapLocation } from '../types/mapLocation';

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

export function categoryFromMarkerCode(
  code: string | null | undefined,
): MapPlaceCategory {
  switch (code?.trim()) {
    case 'FOOD':
      return '음식점';
    case 'CAFE':
      return '카페';
    case 'CULTURE':
      return '문화시설';
    case 'ACTIVITY':
      return '체험';
    case 'SHOPPING':
      return '쇼핑';
    case 'OTHER':
      return '기타';
    case 'ATTRACTION':
    default:
      return '관광지';
  }
}

export function markerCategoryFromMapCategory(
  category: MapPlaceCategory | null,
): SavedMarkerCategoryCode | undefined {
  switch (category) {
    case '관광지':
      return 'ATTRACTION';
    case '문화시설':
      return 'CULTURE';
    case '음식점':
      return 'FOOD';
    case '카페':
      return 'CAFE';
    case '체험':
      return 'ACTIVITY';
    case '쇼핑':
      return 'SHOPPING';
    case '기타':
      return 'OTHER';
    default:
      return undefined;
  }
}

/** 복수 카테고리 → API category 배열. 빈 배열이면 undefined(전체) */
export function markerCategoriesFromMapCategories(
  categories: MapPlaceCategory[],
): SavedMarkerCategoryCode[] | undefined {
  if (categories.length === 0) {
    return undefined;
  }
  const codes = categories
    .map((category) => markerCategoryFromMapCategory(category))
    .filter((code): code is SavedMarkerCategoryCode => code != null);
  return codes.length > 0 ? codes : undefined;
}

export function placeMatchesMapCategories(
  placeCategory: MapPlaceCategory,
  selected: MapPlaceCategory[],
): boolean {
  if (selected.length === 0) {
    return true;
  }
  return selected.includes(placeCategory);
}

export function mapLocationFromMapMarker(
  item: SavedMarkerItemDto,
): MapLocation | null {
  if (!item.placeId || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) {
    return null;
  }
  return {
    name: item.title?.trim() || '장소',
    latitude: item.lat,
    longitude: item.lng,
    contentId: item.placeId,
    address: item.addr1?.trim() || undefined,
    categoryCode: item.categoryCode,
    saved: item.saved,
  };
}

export function mapPlaceFromSavedMarker(item: SavedMarkerItemDto): MapPlace | null {
  if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) {
    return null;
  }

  return {
    id: item.placeId,
    name: item.title?.trim() || '찜한 장소',
    category: categoryFromMarkerCode(item.categoryCode),
    address: item.addr1?.trim() || '',
    distanceKm: 0,
    photoCount: 0,
    latitude: item.lat,
    longitude: item.lng,
  };
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
