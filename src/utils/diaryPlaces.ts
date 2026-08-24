import type { Diary, DiaryPhoto, DiaryPlaceSelection } from '../types/diary';

/** GPS 반올림(약 1m)으로 동일 장소 판별 */
export function placeCoordKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

export type DiaryPlaceGroup = {
  /** 좌표 기반 안정 키 */
  id: string;
  latitude: number;
  longitude: number;
  placeName: string;
  /** 해당 장소에 반영되는 촬영물 1장 (대표) */
  photo: DiaryPhoto;
  /** 같은 GPS의 모든 촬영물 */
  photos: DiaryPhoto[];
  firstCapturedAt: string;
};

/**
 * 동일 GPS끼리 묶고, 장소마다 가장 이른 촬영물 1장만 반영.
 * 그룹은 첫 촬영 시각 오름차순(시간순 방문).
 */
export function buildPlaceGroups(photos: DiaryPhoto[]): DiaryPlaceGroup[] {
  const map = new Map<string, DiaryPhoto[]>();

  for (const photo of photos) {
    const key = placeCoordKey(photo.latitude, photo.longitude);
    const list = map.get(key);
    if (list) {
      list.push(photo);
    } else {
      map.set(key, [photo]);
    }
  }

  const groups: DiaryPlaceGroup[] = [];

  for (const [id, groupPhotos] of map) {
    const sorted = [...groupPhotos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const first = sorted[0];
    groups.push({
      id,
      latitude: first.latitude,
      longitude: first.longitude,
      placeName: (first.placeName ?? '').trim() || '장소 미지정',
      photo: first,
      photos: sorted,
      firstCapturedAt: first.createdAt,
    });
  }

  return groups.sort(
    (a, b) => new Date(a.firstCapturedAt).getTime() - new Date(b.firstCapturedAt).getTime(),
  );
}

/** 장소별 촬영물 — 같은 GPS면 photoIds에 전부 포함 */
export function buildPlaceSelections(photos: DiaryPhoto[]): DiaryPlaceSelection[] {
  return buildPlaceGroups(photos).map((group) => ({
    id: group.id,
    latitude: group.latitude,
    longitude: group.longitude,
    placeName: group.placeName,
    photoIds: group.photos.map((photo) => photo.id),
    representativePhotoId: group.photo.id,
    placeContentId: group.photo.placeContentId ?? null,
  }));
}

export function isPlacesSetupComplete(diary: Diary): boolean {
  return Boolean(diary.placesSetupAt && diary.placeSelections && diary.placeSelections.length > 0);
}

export function findSelectionForPlace(diary: Diary, placeId: string) {
  return diary.placeSelections?.find((s) => s.id === placeId) ?? null;
}

export function resolveRepresentativePhoto(
  diary: Diary,
  placeId: string,
): DiaryPhoto | null {
  const selection = findSelectionForPlace(diary, placeId);
  if (!selection) {
    return null;
  }
  return diary.photos.find((p) => p.id === selection.representativePhotoId) ?? null;
}
