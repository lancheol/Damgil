import { TripDto } from '../api/types';
import { Diary } from '../types/diary';
import { resolvePlaceNameFromAreaCode } from './tripRegions';
import { toDiaryStatus } from './tripStatus';

function toDiaryVisibility(visibility: TripDto['visibility']): Diary['visibility'] {
  return visibility === 'public' ? 'public' : 'private';
}

export async function mergeTripWithLocal(trip: TripDto, local?: Diary): Promise<Diary> {
  const place =
    local?.place?.trim() ||
    (await resolvePlaceNameFromAreaCode(trip.areaCode)) ||
    '';

  return {
    id: trip.id,
    name: trip.title?.trim() || local?.name || '나의 여행',
    place,
    createdAt: trip.startedAt,
    endedAt: trip.endedAt,
    status: toDiaryStatus(trip.status),
    photos: local?.photos ?? [],
    cover: local?.cover ?? null,
    coverDraft: local?.coverDraft ?? null,
    visibility: toDiaryVisibility(trip.visibility),
    placesSetupAt: local?.placesSetupAt ?? null,
    placeSelections: local?.placeSelections ?? null,
  };
}

export async function mergeTripsWithLocal(
  trips: TripDto[],
  localDiaries: Diary[],
): Promise<Diary[]> {
  const localById = new Map(localDiaries.map((diary) => [diary.id, diary]));
  const serverIds = new Set(trips.map((trip) => trip.id));

  const merged = await Promise.all(
    trips.map((trip) => mergeTripWithLocal(trip, localById.get(trip.id))),
  );

  const orphanLocal = localDiaries.filter((diary) => !serverIds.has(diary.id));
  return [...merged, ...orphanLocal];
}
