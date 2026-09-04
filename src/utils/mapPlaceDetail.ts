import type { MapPlaceDetailResponseDto } from '../api/types';
import type { MapPlace } from '../constants/mapPlaces';
import { categoryFromMarkerCode } from './savedMapPlaces';

function readCommonString(
  common: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!common) {
    return '';
  }
  for (const key of keys) {
    const value = common[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function parseCoord(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type MapPlaceDetailView = {
  place: MapPlace;
  images: string[];
  saved: boolean;
  diaryCount: number;
  /** 직선 거리(km). 현재 위치를 안 보냈으면 null */
  distanceKm: number | null;
  /** 길찾기 도착지용 */
  placeId: string;
  lat: number | null;
  lng: number | null;
};

/** 상세 카드용 직선 거리 문구 — 길찾기 경로 거리와 구분 */
export function formatStraightDistanceKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) {
    return null;
  }
  if (km < 0.1) {
    return `${Math.max(1, Math.round(km * 1000))}m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}

export function mapPlaceFromMapDetail(
  detail: MapPlaceDetailResponseDto,
  fallback?: MapPlace | null,
): MapPlaceDetailView {
  const common = detail.common;
  const title =
    readCommonString(common, 'title', 'name') ||
    fallback?.name?.trim() ||
    '장소';
  const address =
    readCommonString(common, 'addr1', 'address') ||
    fallback?.address?.trim() ||
    '';
  const lat =
    parseCoord(detail.lat) ??
    parseCoord(common?.mapy) ??
    parseCoord(common?.mapY) ??
    (fallback && Number.isFinite(fallback.latitude) ? fallback.latitude : null);
  const lng =
    parseCoord(detail.lng) ??
    parseCoord(common?.mapx) ??
    parseCoord(common?.mapX) ??
    (fallback && Number.isFinite(fallback.longitude) ? fallback.longitude : null);

  const images = (detail.images ?? []).filter(
    (url): url is string => typeof url === 'string' && url.trim().length > 0,
  );
  const firstImage = readCommonString(common, 'firstimage', 'firstimage2');
  if (firstImage && !images.includes(firstImage)) {
    images.unshift(firstImage);
  }

  const distanceKm =
    detail.distanceKm != null && Number.isFinite(detail.distanceKm)
      ? detail.distanceKm
      : null;

  return {
    placeId: detail.placeId || fallback?.id || '',
    lat,
    lng,
    images,
    saved: Boolean(detail.saved),
    diaryCount: Math.max(0, detail.diaryCount ?? 0),
    distanceKm,
    place: {
      id: detail.placeId || fallback?.id || '',
      name: title,
      category: categoryFromMarkerCode(String(detail.categoryCode ?? '')),
      address,
      distanceKm: distanceKm ?? fallback?.distanceKm ?? 0,
      photoCount: images.length,
      latitude: lat ?? fallback?.latitude ?? 0,
      longitude: lng ?? fallback?.longitude ?? 0,
    },
  };
}
