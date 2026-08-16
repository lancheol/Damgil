import { listFestivals } from '../api/festivals';
import type { TourApiPlaceItem } from '../api/types';
import type { Festival, RegionSelection } from '../types/festival';

const DISTRICT_ALIASES: Record<string, string[]> = {
  '서울|홍대/신촌': ['마포구', '서대문구'],
  '서울|종로/중구': ['종로구', '중구'],
  '서울|송파/강동': ['송파구', '강동구'],
  '서울|성수/여의도': ['성동구', '영등포구'],
  '경기|수원': ['수원시'],
  '경기|가평': ['가평군'],
  '경기|고양/파주': ['고양시', '파주시'],
  '경기|용인': ['용인시'],
  '강원|강릉': ['강릉시'],
  '강원|평창': ['평창군'],
  '강원|속초/양양': ['속초시', '양양군'],
};

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
  if (festival.region !== selection.region) return false;
  const aliases =
    DISTRICT_ALIASES[`${selection.region}|${selection.district}`] ??
    [selection.district];
  return aliases.some(
    (alias) =>
      festival.district.includes(alias) ||
      festival.address?.includes(alias),
  );
}
