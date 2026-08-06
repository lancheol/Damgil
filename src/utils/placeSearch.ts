export type MapLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

const BASE_LAT = 34.88055;
const BASE_LNG = 128.62115;

/** API 연동 전 샘플 장소 목록 */
const STUB_PLACE_NAMES = [
  '해운대 해수욕장',
  '광안리 해수욕장',
  '센텀시티',
  '자갈치시장',
  '국제시장',
  '남포동',
  '부산역',
  '서면',
  '전포 카페거리',
  '감천문화마을',
  '태종대',
  '용두산공원',
  '고현항 근린공원 물놀이장',
  '거제 바람의 언덕',
  '외도 보타니아',
  '경복궁',
  '남산타워',
  '홍대입구',
  '강남역',
  '여의도 한강공원',
] as const;

/** 장소명마다 조금씩 다른 좌표를 만들어 GPS 그룹이 분리되도록 함 (API 연동 전) */
function stubCoordsForName(name: string): { latitude: number; longitude: number } {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const dLat = ((hash % 2000) - 1000) / 50000;
  const dLng = (((hash >> 9) % 2000) - 1000) / 50000;
  return {
    latitude: BASE_LAT + dLat,
    longitude: BASE_LNG + dLng,
  };
}

function toLocation(name: string): MapLocation {
  return {
    name,
    ...stubCoordsForName(name),
  };
}

/** @deprecated 단일 결과 — searchTravelPlaces 사용 */
export async function searchTravelPlace(query: string): Promise<MapLocation> {
  const results = await searchTravelPlaces(query);
  return results[0] ?? toLocation(query.trim() || '고현항 근린공원 물놀이장');
}

/** API 연동 전 임시 다중 검색 결과 */
export async function searchTravelPlaces(query: string): Promise<MapLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 220);
  });

  const lower = trimmed.toLowerCase();
  const matched = STUB_PLACE_NAMES.filter((name) => name.toLowerCase().includes(lower)).map(
    toLocation,
  );

  const exactExists = matched.some((item) => item.name === trimmed);
  const results = exactExists ? matched : [toLocation(trimmed), ...matched];

  return results.slice(0, 8);
}
