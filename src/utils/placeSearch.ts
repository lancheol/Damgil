export type MapLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

/** API 연동 전 임시 검색 결과 (거제 고현항 근린공원 일대) */
export async function searchTravelPlace(query: string): Promise<MapLocation> {
  const trimmed = query.trim();

  await new Promise((resolve) => {
    setTimeout(resolve, 350);
  });

  return {
    name: trimmed || '고현항 근린공원 물놀이장',
    latitude: 34.88055,
    longitude: 128.62115,
  };
}
