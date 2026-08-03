import { Diary, DiaryPhoto } from '../types/diary';

export const UNSPECIFIED_PLACE = '장소 미지정';

export type TimelineDayGroup = {
  dateKey: string;
  dayNumber: number;
  label: string;
  records: DiaryPhoto[];
};

function toLocalDateKey(iso: string): string {
  const date = new Date(iso);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateKey(dateKey: string): Date {
  const [yyyy, mm, dd] = dateKey.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function diffDays(startKey: string, targetKey: string): number {
  const start = parseDateKey(startKey);
  const target = parseDateKey(targetKey);
  const ms = target.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function formatDisplayDate(dateKey: string): string {
  const [yyyy, mm, dd] = dateKey.split('-');
  return `${yyyy}.${mm}.${dd}`;
}

export function formatRecordTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPlaceLabel(photo: DiaryPhoto): string {
  const name = photo.placeName?.trim();
  return name ? name : UNSPECIFIED_PLACE;
}

export function getDayNumberForPhoto(diary: Diary, photo: DiaryPhoto): number {
  const startKey = toLocalDateKey(diary.createdAt);
  const photoKey = toLocalDateKey(photo.createdAt);
  return Math.max(1, diffDays(startKey, photoKey) + 1);
}

/** 촬영 시각 기준 일자 그룹 + 일차 + 그룹 내 오름차순 정렬 */
export function buildDiaryTimeline(diary: Diary): TimelineDayGroup[] {
  const startKey = toLocalDateKey(diary.createdAt);
  const photos = [...(diary.photos ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const byDate = new Map<string, DiaryPhoto[]>();
  for (const photo of photos) {
    const key = toLocalDateKey(photo.createdAt);
    const list = byDate.get(key) ?? [];
    list.push(photo);
    byDate.set(key, list);
  }

  const dateKeys = [...byDate.keys()].sort();

  return dateKeys.map((dateKey) => {
    const dayNumber = Math.max(1, diffDays(startKey, dateKey) + 1);
    return {
      dateKey,
      dayNumber,
      label: `${dayNumber}일차 · ${formatDisplayDate(dateKey)}`,
      records: byDate.get(dateKey) ?? [],
    };
  });
}
