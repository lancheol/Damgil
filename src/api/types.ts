export type AgreementsPayload = {
  terms: boolean;
  privacy: boolean;
  age14: boolean;
  location?: boolean;
  marketing?: boolean;
  push?: boolean;
  taste?: boolean;
};

export type SignupRequest = {
  email: string;
  password: string;
  nickname: string;
  agreements: AgreementsPayload;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenPair = {
  access: string;
  refresh: string;
};

export type LogoutScope = 'current_device' | 'all_devices';

export type LogoutRequest = {
  scope?: LogoutScope;
  refreshToken?: string;
};

export type LogoutResponseDto = {
  success: boolean;
  scope: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  detail: unknown;
};

export type MeResponse = {
  id: string;
  email: string;
  nickname: string;
  bio: string | null;
  provider: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  profile: unknown;
};

export type UpdateMeRequest = {
  nickname?: string;
  bio?: string;
};

export type AccountDeletionPreviewDto = {
  deleted: boolean;
  willDelete: Record<string, number>;
  willAnonymize: string[];
  willRetain: Record<string, string>;
};

export type AccountDeletionJobDto = {
  jobId: string;
  status: string;
  targets: Record<string, unknown>;
  retryCount: number;
  requestedAt: string;
  completedAt: string | null;
};

export type DeleteAccountResponseDto = {
  deleted: boolean;
  job: AccountDeletionJobDto;
};

/** POST /blocks */
export type CreateBlockRequest = {
  userId: number;
};

/** GET /blocks — Swagger 스키마 비어 있어 정규화용 */
export type BlockedUserDto = {
  userId: string;
  nickname: string | null;
  createdAt: string | null;
};

/** POST /reports */
export type ReportTargetType = 'trip' | 'comment' | 'user';

export type ReportReason =
  | 'inappropriate'
  | 'privacy'
  | 'copyright'
  | 'abuse'
  | 'false_place'
  | 'spam'
  | 'etc';

export type CreateReportRequest = {
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  detail?: string;
};

export type TripVisibility = 'private' | 'friends' | 'public';

export type TripStatus = 'recording' | 'editing' | 'completed';

export type CreateTripRequest = {
  title?: string;
  visibility?: TripVisibility;
  regionIds?: string[];
  startDate?: string;
  endDate?: string;
};

/** PUT /trips/{id} — title·visibility 모두 선택 (필요한 필드만 전송) */
export type UpdateTripRequest = {
  title?: string;
  visibility?: TripVisibility;
};

export type DeletedResponseDto = {
  deleted: boolean;
};

export type ChangeTripStatusRequest = {
  status: TripStatus;
};

export type TripDto = {
  id: string;
  userId: string;
  title: string | null;
  startedAt: string;
  endedAt: string | null;
  visibility: TripVisibility;
  areaCode: number | null;
  coverMediaId: string | null;
  publishedAt: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  status: TripStatus;
  startDate: string | null;
  endDate: string | null;
  coverTitleFont: string | null;
  coverStickerLayout: Record<string, unknown> | null;
};

export type TripListItemDto = TripDto & {
  updatedAt: string;
  regionName: string | null;
  coverThumbUrl: string | null;
  editStatus: 'DRAFT' | 'COMPLETED';
};

export type TripListResponseDto = {
  items: TripListItemDto[];
  total: number;
  hasNext: boolean;
};

export type TripListQuery = {
  editStatus?: 'DRAFT' | 'COMPLETED';
  sort?: 'updated' | 'created';
  page?: number;
  pageSize?: number;
};

export type TripItemKind = 'photo' | 'video';

export type TripItemDto = {
  id: string;
  tripId: string;
  kind: TripItemKind;
  capturedAt: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  placeContentId: string | null;
  createdAt: string;
  order: number;
  mediaId: string | null;
  confirmedPlaceContentId: string | null;
  isManuallyEdited: boolean;
  /** 공개 상세 등에서 함께 내려주는 presigned URL (Swagger 외 라이브 필드) */
  mediaUrl?: string | null;
  thumbUrl?: string | null;
};

export type MatchedPlaceDto = {
  contentId: string;
  title: string;
  dist: string;
};

export type AddTripItemRequest = {
  kind: TripItemKind;
  capturedAt: string;
  lat?: number;
  lng?: number;
  note?: string;
  mediaId?: number;
  clientKey?: string;
};

export type AddTripItemResponseDto = TripItemDto & {
  matchedPlace: MatchedPlaceDto | null;
};

export type SetTripCoverRequest = {
  coverMediaId?: number;
  titleFont?: string;
  stickerLayout?: Record<string, unknown>;
};

export type SetItemDecorationRequest = {
  textContent?: string;
  font?: string;
  stickerLayout?: Record<string, unknown>;
};

export type TripItemDecorationDto = {
  tripItemId: string;
  textContent: string | null;
  font: string | null;
  stickerLayout: Record<string, unknown> | null;
  updatedAt: string;
};

export type EditorObjectType = 'TEXT' | 'STICKER' | 'IMAGE';

export type EditorObjectDto = {
  objectId: string;
  objectType: EditorObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  stickerId?: string;
  mediaId?: string;
};

export type EditorStateDto = {
  objects: EditorObjectDto[];
};

export type DiaryEditorStateDto = {
  dayNumber: number;
  editorState: EditorStateDto;
  revision: number;
  updatedAt: string;
};

export type DiaryEditorStateListResponseDto = {
  editStatus: 'DRAFT' | 'COMPLETED';
  days: DiaryEditorStateDto[];
};

export type AutosaveEditorStateRequest = {
  dayNumber: number;
  revision: number;
  editorState: EditorStateDto;
};

export type AutosaveEditorStateResponseDto = {
  dayNumber: number;
  revision: number;
  updatedAt: string;
};

export type PublishTripRequest = {
  visibility: 'private' | 'public';
};

export type FeedItemDto = {
  id: string;
  userId: string;
  authorNickname: string | null;
  title: string | null;
  areaCode: number | null;
  coverMediaId: string | null;
  visibility: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  startedAt: string;
  endedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type FeedResponseDto = {
  items: FeedItemDto[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export type FeedListQuery = {
  page?: number;
  limit?: number;
  area?: number;
  sort?: 'recent';
};

/** POST /trips/{id}/likes */
export type ToggleLikeResponseDto = {
  liked: boolean;
  likeCount: number;
};

/** POST /trips/{id}/comments */
export type CreateCommentRequest = {
  body: string;
};

export type CommentDto = {
  id: string;
  tripId: string;
  userId: string | null;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  authorNickname: string | null;
};

export type CommentsListResponseDto = {
  items: CommentDto[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export type CommentsListQuery = {
  page?: number;
  limit?: number;
};

/** POST /saves */
export type SavePlaceRequest = {
  contentId: string;
};

export type SavePlaceResponseDto = {
  saved: boolean;
  contentId: string;
};

/** GET /saves — place_cache 없으면 place null */
export type PlaceCacheSummaryDto = {
  contentId: string;
  title: string | null;
  addr1: string | null;
  firstImage: string | null;
  lat: number | null;
  lng: number | null;
  contentTypeId: string | null;
};

export type SavedPlaceItemDto = {
  userId: string;
  contentId: string;
  createdAt: string;
  place: PlaceCacheSummaryDto | null;
};

export type SavedMarkerCategoryCode =
  | 'ATTRACTION'
  | 'CULTURE'
  | 'FOOD'
  | 'CAFE'
  | 'ACTIVITY'
  | 'SHOPPING'
  | 'OTHER';

/** GET /map/saved-markers */
export type SavedMarkerItemDto = {
  placeId: string;
  title: string;
  addr1: string;
  lat: number;
  lng: number;
  categoryCode: SavedMarkerCategoryCode;
  saved: boolean;
};

export type SavedMarkersResponseDto = {
  items: SavedMarkerItemDto[];
  total: number;
};

/** GET /map/places — 지도 bbox 내 장소 */
export type MapPlacesResponseDto = {
  items: SavedMarkerItemDto[];
  total: number;
  truncated: boolean;
  source?: string;
  coverage?: string;
  activeFilter?: boolean;
};

/** GET /map/search */
export type MapSearchResponseDto = {
  total: number;
  items: SavedMarkerItemDto[];
};

/**
 * GET /map/places/:placeId — 지도 장소 상세 (MAP-BE-005/009/015)
 * `/places/:id` 대비 saved·diaryCount·distanceKm·좌표 포함
 */
export type MapPlaceDetailResponseDto = {
  common: Record<string, unknown> | null;
  intro: Record<string, unknown> | null;
  images: string[];
  related: unknown[];
  course: unknown[];
  placeId: string;
  lat: number | null;
  lng: number | null;
  categoryCode: SavedMarkerCategoryCode | string;
  saved: boolean;
  /** PUBLIC + COMPLETED 방문 다이어리 수 */
  diaryCount: number;
  /** 현재 위치(lat/lng)를 보낸 경우에만 직선 거리(km). 없으면 null/미포함 */
  distanceKm?: number | null;
  degraded?: boolean;
};

/** GET /map/places/:placeId/diaries — 장소 방문 다이어리 개인화 조회 */
export type PlaceDiaryItemDto = {
  tripId: string;
  title: string;
  thumbnailUrl1: string | null;
  authorNickname: string;
  publishedAt: string;
  likeCount: number;
  relevanceScore: number;
};

export type PlaceDiarySignalsDto = {
  like: string;
  save: string;
  view: string;
};

export type PlaceDiariesResponseDto = {
  items: PlaceDiaryItemDto[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  signals?: PlaceDiarySignalsDto;
  damping?: boolean;
};

/** POST /settings/feedback */
export type FeedbackType =
  | 'service_opinion'
  | 'feature_request'
  | 'bug_report'
  | 'other';

export type CreateFeedbackRequest = {
  type: FeedbackType;
  content: string;
};

export type FeedbackResponseDto = {
  feedbackId: string;
  type: string;
  createdAt: string;
};

/** GET /settings */
export type SettingsMenuKey =
  | 'feedback'
  | 'guide'
  | 'terms'
  | 'privacy_policy'
  | 'logout'
  | 'withdrawal'
  | (string & {});

export type SettingsMenuItemDto = {
  key: SettingsMenuKey;
  documentType?: string | null;
  version?: string | null;
  url?: string | null;
};

export type SettingsResponseDto = {
  menu: SettingsMenuItemDto[];
};

/** GET /settings/documents/{documentType} */
export type ServiceDocumentDto = {
  id: string;
  documentType: string;
  version: string;
  url: string;
  effectiveAt: string;
  isActive: boolean;
  createdAt: string;
};

/** GET /public/trips · /public/trips/{id} — Swagger 스키마 비어 있어 라이브 응답 기준 */
export type PublicTripListItemDto = TripDto & {
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  coverUrl?: string | null;
};

export type PublicTripDetailDto = PublicTripListItemDto & {
  items: TripItemDto[];
  regionIds: string[];
};

/** Swagger에 스키마 없음 — 응답 description: { [dayNumber]: TripDailyCourse[] } */
export type TripDailyCourseDto = {
  placeContentId?: string | null;
  contentId?: string | null;
  title?: string | null;
  name?: string | null;
  placeName?: string | null;
  lat?: number | null;
  lng?: number | null;
  mapy?: number | string | null;
  mapx?: number | string | null;
  order?: number | null;
  dayNumber?: number | null;
  tripItemId?: string | null;
  capturedAt?: string | null;
};

export type TripDailyCourseResponse = Record<string, TripDailyCourseDto[]>;

export type TripTimelineResponseDto = TripDto & {
  items: TripItemDto[];
  regionIds: string[];
};

export type AreaMetaItem = {
  rnum: number;
  code: string;
  name: string;
};

export type AreaMetaResponse = {
  totalCount: number;
  items: AreaMetaItem[];
};

/** TourAPI /places 검색·주변 결과 */
export type TourApiPlaceItem = {
  contentid?: string;
  contentId?: string;
  title?: string;
  addr1?: string;
  mapx?: string | number;
  mapy?: string | number;
  firstimage?: string;
  [key: string]: unknown;
};

export type TourApiResultDto = {
  totalCount: number;
  items: TourApiPlaceItem[];
  degraded?: boolean;
};

export type PlaceDetailResponseDto = {
  common: Record<string, unknown> | null;
  intro: Record<string, unknown> | null;
  images: string[];
  related: unknown[];
  course: unknown[];
  degraded?: boolean;
};

/** GET /festivals/{contentId} — TourAPI 축제 상세 */
export type FestivalCommonDto = {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  zipcode?: string;
  overview?: string;
  firstimage?: string;
  firstimage2?: string;
  homepage?: string;
  tel?: string;
  telname?: string;
  mapx?: string;
  mapy?: string;
  mlevel?: string;
  areacode?: string;
  sigungucode?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  createdtime?: string;
  modifiedtime?: string;
};

export type FestivalIntroDto = {
  eventstartdate?: string;
  eventenddate?: string;
  eventplace?: string;
  eventhomepage?: string;
  playtime?: string;
  usetimefestival?: string;
  spendtimefestival?: string;
  discountinfofestival?: string;
  bookingplace?: string;
  placeinfo?: string;
  program?: string;
  subevent?: string;
  sponsor1?: string;
  sponsor1tel?: string;
  sponsor2?: string;
  sponsor2tel?: string;
  agelimit?: string;
  festivaltype?: string;
  festivalgrade?: string;
  progresstype?: string;
  contentid?: string;
  contenttypeid?: string;
};

export type PlaceRelatedDto = {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr1: string;
  dist: string;
  img: string;
};

export type FestivalDetailResponseDto = {
  common: FestivalCommonDto | null;
  intro: FestivalIntroDto | null;
  images: string[];
  related: PlaceRelatedDto[];
  course: unknown[];
  degraded?: boolean;
};

export type RegionSearchKind = 'region' | 'emd';
export type RegionSearchLevel = 'sido' | 'sgg' | 'emd';

export type RegionSearchItemDto = {
  kind: RegionSearchKind;
  regionId: string;
  level: RegionSearchLevel;
  name: string;
  sidoName: string;
  sggName?: string;
  emdName?: string;
};

export type RegionSearchResponseDto = {
  query: string;
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  items: RegionSearchItemDto[];
};

export type RegionFilterChildDto = {
  id: string;
  name: string;
};

export type RegionFilterSidoDto = {
  id: string;
  name: string;
  children: RegionFilterChildDto[];
};

export type RegionFilterResponseDto = {
  items: RegionFilterSidoDto[];
};

export type FestivalSearchItemDto = {
  id: string;
  externalId: string;
  name: string;
  address: string | null;
  regionId: string | null;
  regionName: string | null;
  sidoName: string | null;
  emdName: string | null;
  riName: string | null;
  lat: number | null;
  lng: number | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
};

export type FestivalSearchResponseDto = {
  query: string;
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  items: FestivalSearchItemDto[];
};

export class ApiError extends Error {
  status: number;
  code: string;
  detail: unknown;

  constructor(status: number, code: string, message: string, detail: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}
