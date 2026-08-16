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
