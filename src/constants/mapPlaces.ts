export type MapPlaceCategory = '음식점' | '카페' | '관광지' | '문화시설' | '체험' | '쇼핑';

export type MapPlace = {
  id: string;
  name: string;
  category: MapPlaceCategory;
  address: string;
  /** 현재 위치 기준 거리 (km) — 위치 API 연동 전 임시 값 */
  distanceKm: number;
  photoCount: number;
  latitude: number;
  longitude: number;
};

export const MAP_CATEGORIES: MapPlaceCategory[] = [
  '음식점',
  '카페',
  '관광지',
  '문화시설',
  '체험',
  '쇼핑',
];

export const MAP_INITIAL_REGION = {
  latitude: 37.5445,
  longitude: 127.0374,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

/** 장소 API 연동 전까지 사용하는 임시 목록 */
export const MAP_PLACES: MapPlace[] = [
  {
    id: 'place-01',
    name: '서울숲 피크닉 스팟',
    category: '관광지',
    address: '서울 성동구 뚝섬로',
    distanceKm: 1.2,
    photoCount: 7,
    latitude: 37.5445,
    longitude: 127.0374,
  },
  {
    id: 'place-02',
    name: '성수 대림창고',
    category: '카페',
    address: '서울 성동구 성수이로',
    distanceKm: 0.8,
    photoCount: 3,
    latitude: 37.5417,
    longitude: 127.0561,
  },
  {
    id: 'place-03',
    name: '뚝섬 한강공원',
    category: '관광지',
    address: '서울 광진구 강변북로',
    distanceKm: 2.1,
    photoCount: 5,
    latitude: 37.5301,
    longitude: 127.0668,
  },
  {
    id: 'place-04',
    name: '왕십리 곱창골목',
    category: '음식점',
    address: '서울 성동구 왕십리로',
    distanceKm: 1.7,
    photoCount: 2,
    latitude: 37.5613,
    longitude: 127.0374,
  },
  {
    id: 'place-05',
    name: '언더스탠드에비뉴',
    category: '쇼핑',
    address: '서울 성동구 왕십리로 63',
    distanceKm: 1.4,
    photoCount: 4,
    latitude: 37.5464,
    longitude: 127.0428,
  },
  {
    id: 'place-06',
    name: '서울숲 갤러리아포레',
    category: '문화시설',
    address: '서울 성동구 서울숲2길',
    distanceKm: 1.1,
    photoCount: 1,
    latitude: 37.5477,
    longitude: 127.0448,
  },
  {
    id: 'place-07',
    name: '성수 수제화 공방 체험',
    category: '체험',
    address: '서울 성동구 아차산로',
    distanceKm: 2.6,
    photoCount: 2,
    latitude: 37.5449,
    longitude: 127.0592,
  },
];
