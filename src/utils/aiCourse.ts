import { AiCourse, AiCourseDay, AiCourseStop, CreateAiCourseInput } from '../types/aiCourse';

type RegionBase = {
  keyword: string;
  latitude: number;
  longitude: number;
};

/** 좌표 API 연동 전, 여행지 키워드로 대략적인 중심 좌표를 잡는다 */
const REGION_BASES: RegionBase[] = [
  { keyword: '제주', latitude: 33.4996, longitude: 126.5312 },
  { keyword: '부산', latitude: 35.1796, longitude: 129.0756 },
  { keyword: '강릉', latitude: 37.7519, longitude: 128.8761 },
  { keyword: '속초', latitude: 38.207, longitude: 128.5918 },
  { keyword: '여수', latitude: 34.7604, longitude: 127.6622 },
  { keyword: '경주', latitude: 35.8562, longitude: 129.2247 },
  { keyword: '전주', latitude: 35.8242, longitude: 127.148 },
  { keyword: '인천', latitude: 37.4563, longitude: 126.7052 },
  { keyword: '대구', latitude: 35.8714, longitude: 128.6014 },
  { keyword: '광주', latitude: 35.1595, longitude: 126.8526 },
  { keyword: '대전', latitude: 36.3504, longitude: 127.3845 },
  { keyword: '서울', latitude: 37.5665, longitude: 126.978 },
];

const DEFAULT_BASE: RegionBase = { keyword: '기본', latitude: 37.5665, longitude: 126.978 };
const STOP_TIMES = ['10:00', '12:30', '15:00', '17:30'];
const DAY_TITLES = ['도착 후 시내 둘러보기', '자연 속 힐링 코스', '감성 스팟 투어', '여유로운 마무리'];

function resolveBase(destination: string): RegionBase {
  return REGION_BASES.find((base) => destination.includes(base.keyword)) ?? DEFAULT_BASE;
}

function hashOffset(seed: string, index: number): { latitude: number; longitude: number } {
  let hash = index * 977;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return {
    latitude: ((hash % 400) - 200) / 10000,
    longitude: (((hash >> 7) % 400) - 200) / 10000,
  };
}

/** '2박 3일' → 3, '당일치기' → 1 */
function resolveDayCount(schedule: string): number {
  const nightMatch = schedule.match(/(\d+)\s*박/);
  if (nightMatch) {
    return Math.min(Number(nightMatch[1]) + 1, 5);
  }

  const dayMatch = schedule.match(/(\d+)\s*일/);
  if (dayMatch) {
    return Math.min(Math.max(Number(dayMatch[1]), 1), 5);
  }

  return 1;
}

function formatDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}.${month}.${day}`;
}

function buildStops(
  destination: string,
  places: string[],
  dayIndex: number,
  base: RegionBase,
): AiCourseStop[] {
  const names =
    places.length > 0
      ? places
      : [`${destination} 추천 스팟`, `${destination} 맛집`, `${destination} 인기 카페`];

  return names.map((name, index) => {
    const offset = hashOffset(`${name}-${dayIndex}`, index + 1);
    return {
      id: `stop-${dayIndex}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      time: STOP_TIMES[index % STOP_TIMES.length],
      name,
      description: 'AI가 추천한 일정',
      latitude: base.latitude + offset.latitude,
      longitude: base.longitude + offset.longitude,
    };
  });
}

/** 코스 생성 API 연동 전, 입력값으로 코스 초안을 만든다 */
export function buildAiCourse(input: CreateAiCourseInput): AiCourse {
  const destination = input.destination.trim() || '국내';
  const schedule = input.schedule.trim() || '당일치기';
  const base = resolveBase(destination);
  const dayCount = resolveDayCount(schedule);

  const perDay = Math.max(1, Math.ceil(input.places.length / dayCount));
  const days: AiCourseDay[] = Array.from({ length: dayCount }, (_, dayIndex) => {
    const slice = input.places.slice(dayIndex * perDay, (dayIndex + 1) * perDay);
    return {
      day: dayIndex + 1,
      title: DAY_TITLES[dayIndex % DAY_TITLES.length],
      stops: buildStops(destination, slice, dayIndex, base),
    };
  });

  const departure = new Date();
  departure.setDate(departure.getDate() + 7);

  return {
    id: `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${destination} ${schedule} AI 추천 코스`,
    tags: [`#${destination}`, `#${schedule}`, `#${input.transport}`],
    startDate: formatDate(departure),
    transport: input.transport,
    days,
  };
}
