/** 지역 상세 검색에서 선택한 시·도 + 시·군·구 */
export type RegionSelection = {
  sidoId: string;
  regionId: string;
  region: string;
  district: string;
};

export const regionSelectionKey = ({ regionId }: RegionSelection) => regionId;

export type Festival = {
  id: string;
  title: string;
  /** 시·도 단위 (지역 필터 기준) */
  region: string;
  /** 시·군·구 단위 */
  district: string;
  /** TourAPI 도로명/지번 주소 */
  address?: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  tags: string[];
  imageUri?: string;
};
