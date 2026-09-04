import type { Region } from 'react-native-maps';

export type MapBbox = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

/** MapView region → 서버 bbox (sw/ne) */
export function regionToBbox(region: Region): MapBbox {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return {
    swLat: region.latitude - halfLat,
    swLng: region.longitude - halfLng,
    neLat: region.latitude + halfLat,
    neLng: region.longitude + halfLng,
  };
}

export function isValidBbox(bbox: MapBbox): boolean {
  return bbox.swLat < bbox.neLat && bbox.swLng < bbox.neLng;
}

/**
 * bbox coverage가 전체(full)가 아니면 부분 노출로 본다.
 * 서버 값이 없거나 full이면 false.
 */
export function isPartialMapCoverage(coverage: string | null | undefined): boolean {
  const value = coverage?.trim().toLowerCase();
  if (!value) {
    return false;
  }
  if (value === 'full' || value === 'complete' || value === 'all') {
    return false;
  }
  return true;
}
