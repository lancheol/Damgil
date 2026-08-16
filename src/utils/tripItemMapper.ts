import { TripItemDto, TripTimelineResponseDto } from '../api/types';
import { Diary, DiaryPhoto } from '../types/diary';
import { buildPlaceSelections, isPlacesSetupComplete } from './diaryPlaces';
import { looksLikeGeojeStub } from './tripDailyCourse';
import { toDiaryStatus } from './tripStatus';

function toDiaryPhoto(
  item: TripItemDto,
  local?: DiaryPhoto,
  serverUri?: string | null,
): DiaryPhoto {
  const placeContentId =
    item.confirmedPlaceContentId || item.placeContentId || local?.placeContentId || null;

  let latitude = item.lat ?? local?.latitude ?? 0;
  let longitude = item.lng ?? local?.longitude ?? 0;

  // 서버/로컬에 남은 거제 stub 좌표보다, 정상 로컬 좌표를 우선
  if (
    local &&
    looksLikeGeojeStub(latitude, longitude) &&
    !looksLikeGeojeStub(local.latitude, local.longitude) &&
    !(local.latitude === 0 && local.longitude === 0)
  ) {
    latitude = local.latitude;
    longitude = local.longitude;
  }

  return {
    id: item.id,
    uri: local?.uri || serverUri || '',
    mediaType: item.kind === 'video' ? 'video' : 'photo',
    mediaId: item.mediaId ?? local?.mediaId ?? null,
    placeName: local?.placeName ?? null,
    note: item.note?.trim() || local?.note || '',
    latitude,
    longitude,
    placeContentId,
    createdAt: item.capturedAt,
    decoration: local?.decoration ?? null,
  };
}

/** 서버 items(촬영시각순) + 로컬 uri·꾸미기 데이터 병합 */
export function mergeTripItemsWithLocalPhotos(
  items: TripItemDto[],
  localPhotos: DiaryPhoto[],
  mediaUrisByItemId: Record<string, string | null> = {},
): DiaryPhoto[] {
  const localById = new Map(localPhotos.map((photo) => [photo.id, photo]));
  const seen = new Set<string>();
  const merged: DiaryPhoto[] = [];

  for (const item of items) {
    merged.push(toDiaryPhoto(item, localById.get(item.id), mediaUrisByItemId[item.id]));
    seen.add(item.id);
  }

  for (const photo of localPhotos) {
    if (!seen.has(photo.id)) {
      merged.push(photo);
    }
  }

  return merged.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function applyTimelineToDiary(
  timeline: TripTimelineResponseDto,
  local: Diary,
  mediaUrisByItemId: Record<string, string | null> = {},
): Diary {
  const photos = mergeTripItemsWithLocalPhotos(
    timeline.items,
    local.photos ?? [],
    mediaUrisByItemId,
  );
  const nextDiary: Diary = {
    ...local,
    name: timeline.title?.trim() || local.name,
    createdAt: timeline.startedAt,
    endedAt: timeline.endedAt ?? local.endedAt ?? null,
    status: toDiaryStatus(timeline.status ?? local.status),
    visibility: timeline.visibility === 'public' ? 'public' : 'private',
    photos,
  };

  if (!isPlacesSetupComplete(local) && photos.length > 0) {
    const selections = buildPlaceSelections(photos);
    if (selections.length > 0) {
      nextDiary.placeSelections = selections;
    }
  }

  return nextDiary;
}
