import { getRegionFilters } from '../api/search';
import type { RegionFilterSidoDto } from '../api/types';

let cachedAreas: Promise<RegionFilterSidoDto[]> | null = null;

export function loadRegionFilterTree(force = false): Promise<RegionFilterSidoDto[]> {
  if (!cachedAreas || force) {
    cachedAreas = getRegionFilters()
      .then((response) => response.items ?? [])
      .catch((error) => {
        cachedAreas = null;
        throw error;
      });
  }
  return cachedAreas;
}
