export type MapLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

const BASE_LAT = 34.88055;
const BASE_LNG = 128.62115;

/** 장소명마다 조금씩 다른 좌표를 만들어 GPS 그룹이 분리되도록 함 (API 연동 전) */
function stubCoordsForName(name: string): { latitude: number; longitude: number } {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const dLat = ((hash % 2000) - 1000) / 50000;
  const dLng = ((((hash >> 9) % 2000) - 1000) / 50000);
  return {
    latitude: BASE_LAT + dLat,
    longitude: BASE_LNG + dLng,
  };
}

/** API 연동 전 임시 검색 결과 */
export async function searchTravelPlace(query: string): Promise<MapLocation> {
  const trimmed = query.trim();
  const name = trimmed || '고현항 근린공원 물놀이장';

  await new Promise((resolve) => {
    setTimeout(resolve, 350);
  });

  const coords = stubCoordsForName(name);
  return {
    name,
    ...coords,
  };
}
