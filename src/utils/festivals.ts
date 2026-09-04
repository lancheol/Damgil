import { listFestivals } from '../api/festivals';
import type { TourApiPlaceItem } from '../api/types';
import type { Festival, RegionSelection } from '../types/festival';

function normalizeRegionName(value: string): string {
  return value
    .trim()
    .replace(/특별자치도|특별시|광역시|특별자치시/g, '')
    .replace(/도$/, '');
}

function matchesRegionName(festivalRegion: string, selectionRegion: string): boolean {
  const festival = normalizeRegionName(festivalRegion);
  const selected = normalizeRegionName(selectionRegion);
  if (!festival || !selected) return false;
  return (
    festival === selected ||
    festivalRegion.includes(selectionRegion) ||
    selectionRegion.includes(festivalRegion)
  );
}

let festivalCache: Promise<Festival[]> | null = null;

function readString(item: TourApiPlaceItem, ...keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function formatDate(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function parseAddress(address: string): { region: string; district: string } {
  const [rawRegion = '', rawDistrict = ''] = address.split(/\s+/);
  const region = rawRegion
    .replace('서울특별시', '서울')
    .replace('부산광역시', '부산')
    .replace('인천광역시', '인천')
    .replace('강원특별자치도', '강원')
    .replace('경기도', '경기')
    .replace('제주특별자치도', '제주');
  return { region, district: rawDistrict };
}

export function mapFestivalItem(item: TourApiPlaceItem): Festival | null {
  const id = readString(item, 'contentid', 'contentId');
  const title = readString(item, 'title');
  if (!id || !title) return null;

  const address = readString(item, 'addr1');
  const { region, district } = parseAddress(address);
  const startDate = formatDate(readString(item, 'eventstartdate', 'eventStartDate'));
  const endDate = formatDate(readString(item, 'eventenddate', 'eventEndDate'));

  return {
    id,
    title,
    region,
    district,
    address,
    startDate,
    endDate: endDate || startDate,
    tags: [],
    imageUri: readString(item, 'firstimage', 'image') || undefined,
  };
}

export async function loadFestivals(force = false): Promise<Festival[]> {
  if (!festivalCache || force) {
    festivalCache = listFestivals({ rows: 500 })
      .then((response) =>
        response.items
          .map(mapFestivalItem)
          .filter((festival): festival is Festival => festival != null),
      )
      .catch((error) => {
        festivalCache = null;
        throw error;
      });
  }
  return festivalCache;
}

export function matchesFestivalRegion(
  festival: Festival,
  selection: RegionSelection,
): boolean {
  if (!matchesRegionName(festival.region, selection.region)) {
    return false;
  }

  const district = selection.district.trim();
  if (!district) return true;

  return (
    festival.district.includes(district) ||
    district.includes(festival.district) ||
    (festival.address?.includes(district) ?? false)
  );
}
