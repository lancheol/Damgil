import { getAreas } from '../api/meta';
import { AreaMetaItem } from '../api/types';

let cachedAreas: AreaMetaItem[] | null = null;

async function loadAreas(): Promise<AreaMetaItem[]> {
  if (cachedAreas) {
    return cachedAreas;
  }
  const response = await getAreas();
  cachedAreas = response.items ?? [];
  return cachedAreas;
}

function normalizePlace(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

function matchesArea(place: string, areaName: string): boolean {
  const normalizedPlace = normalizePlace(place);
  const normalizedArea = normalizePlace(areaName);
  if (!normalizedPlace || !normalizedArea) {
    return false;
  }
  if (normalizedPlace === normalizedArea) {
    return true;
  }
  if (normalizedArea.includes(normalizedPlace) || normalizedPlace.includes(normalizedArea)) {
    return true;
  }
  const shortPlace = normalizedPlace.slice(0, 2);
  const shortArea = normalizedArea.slice(0, 2);
  return shortPlace.length >= 2 && shortPlace === shortArea;
}

export async function resolveRegionIdsFromPlace(place: string): Promise<string[]> {
  const query = place.trim();
  if (!query) {
    return [];
  }

  const areas = await loadAreas();
  const matched = areas.filter((area) => matchesArea(query, area.name));
  if (matched.length === 0) {
    return [];
  }

  return matched.map((area) => area.code);
}

export async function resolvePlaceNameFromAreaCode(
  areaCode: number | null | undefined,
): Promise<string> {
  if (areaCode == null || Number.isNaN(areaCode)) {
    return '';
  }
  const areas = await loadAreas();
  const code = String(areaCode);
  return areas.find((area) => area.code === code)?.name ?? '';
}
