import { TripDailyCourseDto } from '../api/types';
import { Diary } from '../types/diary';
import { buildDiaryTimeline } from './diaryTimeline';
import {
  resolvePlaceCoordsByContentId,
  resolvePlaceCoordsByName,
} from './placeSearch';

export type DailyCourseStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  placeContentId?: string | null;
};

export type DailyCourseDay = {
  day: number;
  stops: DailyCourseStop[];
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function readName(item: Record<string, unknown>): string {
  const nested =
    item.place && typeof item.place === 'object'
      ? (item.place as Record<string, unknown>)
      : null;
  const candidates = [
    item.placeName,
    item.title,
    item.name,
    nested?.title,
    nested?.name,
    nested?.placeName,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '장소';
}

/** TourAPI: mapy=위도, mapx=경도. lat/lng·latitude/longitude·중첩 place도 허용 */
function readCoords(item: Record<string, unknown>): { lat: number; lng: number } | null {
  const nested =
    item.place && typeof item.place === 'object'
      ? (item.place as Record<string, unknown>)
      : null;
  const sources = [item, nested].filter(Boolean) as Record<string, unknown>[];

  let lat: number | null = null;
  let lng: number | null = null;

  for (const src of sources) {
    lat =
      lat ??
      toNumber(src.lat) ??
      toNumber(src.latitude) ??
      toNumber(src.mapy) ??
      toNumber(src.mapY) ??
      toNumber(src.y);
    lng =
      lng ??
      toNumber(src.lng) ??
      toNumber(src.longitude) ??
      toNumber(src.mapx) ??
      toNumber(src.mapX) ??
      toNumber(src.x);
  }

  if (lat == null || lng == null) {
    return null;
  }

  // 위·경도가 뒤바뀐 경우(한국: lat≈33~39, lng≈124~132)
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const swapped = { lat: lng, lng: lat };
    lat = swapped.lat;
    lng = swapped.lng;
  } else if (lat > 90 || lat < -90 || lng > 180 || lng < -180) {
    return null;
  } else if (
    // 한국 범위에서 lat/lng 스왑 추정
    lat >= 120 &&
    lat <= 135 &&
    lng >= 30 &&
    lng <= 45
  ) {
    const swapped = { lat: lng, lng: lat };
    lat = swapped.lat;
    lng = swapped.lng;
  }

  if (lat === 0 && lng === 0) {
    return null;
  }

  return { lat, lng };
}

function asStop(
  item: TripDailyCourseDto | Record<string, unknown>,
  day: number,
  index: number,
): DailyCourseStop | null {
  const raw = item as Record<string, unknown>;
  const coords = readCoords(raw);
  if (!coords) {
    return null;
  }
  return {
    id: String(
      raw.tripItemId ??
        raw.placeContentId ??
        raw.contentId ??
        raw.contentid ??
        `${day}-${index}`,
    ),
    name: readName(raw),
    latitude: coords.lat,
    longitude: coords.lng,
    order: toNumber(raw.order) ?? toNumber(raw.num) ?? index + 1,
    placeContentId:
      (typeof raw.placeContentId === 'string' && raw.placeContentId) ||
      (typeof raw.contentId === 'string' && raw.contentId) ||
      (typeof raw.contentid === 'string' && raw.contentid) ||
      (typeof raw.confirmedPlaceContentId === 'string' && raw.confirmedPlaceContentId) ||
      null,
  };
}

function parseDayList(list: unknown, day: number): DailyCourseStop[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((item, index) =>
      item && typeof item === 'object'
        ? asStop(item as Record<string, unknown>, day, index)
        : null,
    )
    .filter((item): item is DailyCourseStop => item != null)
    .sort((a, b) => a.order - b.order);
}

export function normalizeTripDailyCourse(raw: unknown): DailyCourseDay[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const record = raw as Record<string, unknown>;

  // { "1": [...], "2": [...] }
  const fromKeyed: DailyCourseDay[] = [];
  for (const [key, list] of Object.entries(record)) {
    const day = Number(key);
    if (!Number.isFinite(day) || day < 1) {
      continue;
    }
    const stops = parseDayList(list, day);
    if (stops.length > 0) {
      fromKeyed.push({ day, stops });
    }
  }
  if (fromKeyed.length > 0) {
    return fromKeyed.sort((a, b) => a.day - b.day);
  }

  // { days: [{ dayNumber|day, items|stops|places: [] }] }
  const daysNode = record.days;
  if (Array.isArray(daysNode)) {
    const fromDays: DailyCourseDay[] = [];
    for (const entry of daysNode) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const row = entry as Record<string, unknown>;
      const day = toNumber(row.dayNumber) ?? toNumber(row.day) ?? toNumber(row.day_number);
      if (day == null || day < 1) {
        continue;
      }
      const stops = parseDayList(row.items ?? row.stops ?? row.places ?? row.course, day);
      if (stops.length > 0) {
        fromDays.push({ day, stops });
      }
    }
    if (fromDays.length > 0) {
      return fromDays.sort((a, b) => a.day - b.day);
    }
  }

  return [];
}

function coordsFromPlaceId(id: string): { lat: number; lng: number } | null {
  const parts = id.split(',');
  if (parts.length !== 2) {
    return null;
  }
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat === 0 && lng === 0) {
    return null;
  }
  return { lat, lng };
}

/** API 실패·빈 응답 시 로컬 장소 선택·사진 GPS로 일차 코스 구성 */
export function buildLocalDailyCourse(diary: Diary): DailyCourseDay[] {
  const timeline = buildDiaryTimeline(diary);
  if (!timeline.length) {
    return [];
  }

  const places = diary.placeSelections ?? [];
  const photos = diary.photos ?? [];

  return timeline
    .map((group) => {
      const dayPhotoIds = new Set(group.records.map((item) => item.id));
      const fromPlaces: DailyCourseStop[] = places
        .filter(
          (place) =>
            dayPhotoIds.has(place.representativePhotoId) ||
            place.photoIds.some((id) => dayPhotoIds.has(id)),
        )
        .map((place, index): DailyCourseStop | null => {
          const fromId = coordsFromPlaceId(place.id);
          const lat = place.latitude || fromId?.lat || 0;
          const lng = place.longitude || fromId?.lng || 0;
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
            return null;
          }
          return {
            id: place.id,
            name: place.placeName,
            latitude: lat,
            longitude: lng,
            order: index + 1,
            placeContentId: place.placeContentId ?? null,
          };
        })
        .filter((item): item is DailyCourseStop => item != null);

      if (fromPlaces.length > 0) {
        return { day: group.dayNumber, stops: fromPlaces };
      }

      // placeSelections 없을 때 그날 사진 GPS로 구성
      const fromPhotos: DailyCourseStop[] = [];
      const seen = new Set<string>();
      group.records.forEach((photo, index) => {
        const lat = photo.latitude;
        const lng = photo.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
          return;
        }
        const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        fromPhotos.push({
          id: photo.id,
          name: (photo.placeName ?? '').trim() || '장소',
          latitude: lat,
          longitude: lng,
          order: fromPhotos.length + 1,
          placeContentId: photo.placeContentId ?? null,
        });
      });

      // photos 배열에서 같은 id 보강
      if (fromPhotos.length === 0) {
        photos
          .filter((photo) => dayPhotoIds.has(photo.id))
          .forEach((photo) => {
            const lat = photo.latitude;
            const lng = photo.longitude;
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
              return;
            }
            const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
            if (seen.has(key)) {
              return;
            }
            seen.add(key);
            fromPhotos.push({
              id: photo.id,
              name: (photo.placeName ?? '').trim() || '장소',
              latitude: lat,
              longitude: lng,
              order: fromPhotos.length + 1,
              placeContentId: photo.placeContentId ?? null,
            });
          });
      }

      return { day: group.dayNumber, stops: fromPhotos };
    })
    .filter((day) => day.stops.length > 0);
}

/** 예전 거제 stub(고현 근처)에 묶인 좌표인지 */
export function looksLikeGeojeStub(lat: number, lng: number): boolean {
  return lat >= 34.7 && lat <= 35.1 && lng >= 128.4 && lng <= 128.9;
}

/** TourAPI 장소 좌표로 코스 마커 보정 (거제 stub·잘못된 저장값 교정) */
export async function resolveDailyCourseCoordinates(
  days: DailyCourseDay[],
): Promise<DailyCourseDay[]> {
  const resolved: DailyCourseDay[] = [];
  for (const day of days) {
    const stops: DailyCourseStop[] = [];
    for (const stop of day.stops) {
      let next = stop;
      const needsFix =
        looksLikeGeojeStub(stop.latitude, stop.longitude) ||
        (stop.latitude === 0 && stop.longitude === 0);

      if (stop.placeContentId) {
        const byId = await resolvePlaceCoordsByContentId(stop.placeContentId);
        if (byId) {
          next = {
            ...stop,
            name: byId.name || stop.name,
            latitude: byId.latitude,
            longitude: byId.longitude,
            placeContentId: byId.contentId ?? stop.placeContentId,
          };
        }
      } else if (needsFix) {
        const byName = await resolvePlaceCoordsByName(stop.name);
        if (byName) {
          next = {
            ...stop,
            name: byName.name || stop.name,
            latitude: byName.latitude,
            longitude: byName.longitude,
            placeContentId: byName.contentId ?? stop.placeContentId,
          };
        }
      }
      stops.push(next);
    }
    if (stops.length > 0) {
      resolved.push({ day: day.day, stops });
    }
  }
  return resolved;
}

/** API 코스에 좌표가 없으면 로컬 GPS로 보강. API가 비면 로컬만 사용 */
export function mergeDailyCourseWithLocal(
  fromApi: DailyCourseDay[],
  local: DailyCourseDay[],
): DailyCourseDay[] {
  if (fromApi.length === 0) {
    return local;
  }
  if (local.length === 0) {
    return fromApi;
  }

  const localByDay = new Map(local.map((day) => [day.day, day.stops]));

  return fromApi.map((day) => {
    const localStops = localByDay.get(day.day) ?? [];
    const stops = day.stops.map((stop, index) => {
      if (stop.latitude !== 0 && stop.longitude !== 0) {
        return stop;
      }
      const byName = localStops.find(
        (item) => item.name === stop.name || item.id === stop.id,
      );
      const fallback = byName ?? localStops[index];
      if (!fallback) {
        return stop;
      }
      return {
        ...stop,
        latitude: fallback.latitude,
        longitude: fallback.longitude,
      };
    });

    const valid = stops.filter((s) => !(s.latitude === 0 && s.longitude === 0));
    return {
      day: day.day,
      stops: valid.length > 0 ? valid : localStops,
    };
  });
}
