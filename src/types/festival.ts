/** 지역 상세 검색에서 선택한 시·도 + 세부 지역 */
export type RegionSelection = {
  region: string;
  district: string;
};

export const regionSelectionKey = ({ region, district }: RegionSelection) =>
  `${region}|${district}`;

export type Festival = {
  id: string;
  title: string;
  /** 시·도 단위 (지역 필터 기준) */
  region: string;
  /** 시·군·구 단위 */
  district: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  tags: string[];
  imageUri?: string;
};
