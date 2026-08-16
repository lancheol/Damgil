import { TripDto, TripListItemDto } from '../api/types';
import { Diary } from '../types/diary';
import { resolvePlaceNameFromAreaCode } from './tripRegions';
import { toDiaryStatus } from './tripStatus';

function toDiaryVisibility(visibility: TripDto['visibility']): Diary['visibility'] {
  return visibility === 'public' ? 'public' : 'private';
}

function isLegacyLocalDiaryId(diaryId: string): boolean {
  return !/^\d+$/.test(diaryId);
}

export async function mergeTripWithLocal(
  trip: TripListItemDto,
  local?: Diary,
): Promise<Diary> {
  const place =
    local?.place?.trim() ||
    trip.regionName?.trim() ||
    (await resolvePlaceNameFromAreaCode(trip.areaCode)) ||
    '';

  return {
    id: trip.id,
    name: trip.title?.trim() || local?.name || '나의 여행',
    place,
    createdAt: trip.startedAt,
    endedAt: trip.endedAt,
    status: toDiaryStatus(trip.status),
    editStatus: trip.editStatus ?? local?.editStatus ?? null,
    updatedAt: trip.updatedAt ?? local?.updatedAt ?? null,
    likeCount: trip.likeCount ?? local?.likeCount ?? 0,
    commentCount: trip.commentCount ?? local?.commentCount ?? 0,
    coverThumbUrl: trip.coverThumbUrl ?? local?.coverThumbUrl ?? null,
    photos: local?.photos ?? [],
    cover: local?.cover ?? null,
    coverDraft: local?.coverDraft ?? null,
    visibility: toDiaryVisibility(trip.visibility),
    placesSetupAt: local?.placesSetupAt ?? null,
    placeSelections: local?.placeSelections ?? null,
  };
}

export async function mergeTripsWithLocal(
  trips: TripListItemDto[],
  localDiaries: Diary[],
): Promise<Diary[]> {
  const localById = new Map(localDiaries.map((diary) => [diary.id, diary]));
  const serverIds = new Set(trips.map((trip) => trip.id));

  const merged = await Promise.all(
    trips.map((trip) => mergeTripWithLocal(trip, localById.get(trip.id))),
  );

  // 전체 페이지를 모은 뒤: 레거시 diary-* 만 orphan으로 유지.
  // 숫자 id인데 목록에 없으면 소프트삭제로 보고 로컬에서 제거한다.
  const orphanLocal = localDiaries.filter(
    (diary) => !serverIds.has(diary.id) && isLegacyLocalDiaryId(diary.id),
  );
  return [...merged, ...orphanLocal];
}
