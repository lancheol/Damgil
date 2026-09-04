export type MapLocation = {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  contentTypeId?: string;
  /** TourAPI / PlaceCache contentId — 위치 확정 API에 필요 */
  contentId?: string;
  categoryCode?: string;
  saved?: boolean;
};
