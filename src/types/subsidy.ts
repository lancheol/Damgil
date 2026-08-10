export type TravelSubsidy = {
  id: string;
  /** 시·도 + 세부 지역 표기 (예: 서울 강남구) */
  area: string;
  title: string;
  /** 발급 조건 등 부가 설명 */
  detail: string;
  tags: string[];
  imageUri?: string;
};
