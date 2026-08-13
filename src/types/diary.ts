export type DiaryMediaType = 'photo' | 'video';

export type DecorFontId = 'sans' | 'serif' | 'mono' | 'rounded' | 'hand' | 'display';

export type DecorSticker = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

/** 사진 위 텍스트 레이어 (스티커와 동일 제스처) */
export type DecorTextLayer = {
  id: string;
  content: string;
  fontId: DecorFontId;
  color: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type CoverFontId = DecorFontId;
export type CoverSticker = DecorSticker;

export type DiaryCover = {
  coverPhotoId: string | null;
  title: string;
  fontId: DecorFontId;
  /** 표지 제목 위치 (0~1), 기본 중앙 */
  titleX?: number;
  titleY?: number;
  /** 표지 제목 크기·회전 (스티커와 동일 제스처) */
  titleScale?: number;
  titleRotation?: number;
  stickers: DecorSticker[];
  /** 표지 위 자유 배치 사진 레이어 */
  photos?: DecorPhotoLayer[];
  /** 표지 위 자유 배치 문구 레이어 */
  texts?: DecorTextLayer[];
  /** 표지 배경색 (대표 이미지 대신) */
  backgroundColor?: string;
  updatedAt: string;
};

/** 원본 미디어 위 별도 레이어 (원본 uri는 교체하지 않음) */
export type PhotoCropRect = {
  /** 0~1, 이미지 프레임 기준 */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PhotoDecoration = {
  stickers: DecorSticker[];
  texts: DecorTextLayer[];
  /** 목록 미리보기용 — texts에서 파생 */
  note: string;
  fontId: DecorFontId;
  /** 표시용 자르기 (원본 uri 유지) */
  cropRect?: PhotoCropRect | null;
  updatedAt: string;
};

export type DiaryPhoto = {
  id: string;
  uri: string;
  mediaType: DiaryMediaType;
  placeName?: string | null;
  note?: string;
  latitude: number;
  longitude: number;
  /** TourAPI contentId — 확정 장소 */
  placeContentId?: string | null;
  createdAt: string;
  decoration?: PhotoDecoration | null;
};

/** 다이어리 페이지 위 촬영물 레이어 (여백을 두고 이동·크기 조절) */
export type DecorPhotoLayer = {
  id: string;
  photoId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  cropRect?: PhotoCropRect | null;
};

/** 장소(페이지) 단위 꾸미기 — 사진·스티커·문구를 페이지에 자유롭게 배치 */
export type PlacePageDecoration = {
  photos: DecorPhotoLayer[];
  stickers: DecorSticker[];
  texts: DecorTextLayer[];
  updatedAt: string;
};

/** 여행 종료 후 첫 편집에서 확정한 장소별 대표 사진 */
export type DiaryPlaceSelection = {
  /** GPS 좌표 키 (예: "35.15320,129.11850") */
  id: string;
  latitude: number;
  longitude: number;
  placeName: string;
  photoIds: string[];
  representativePhotoId: string;
  placeContentId?: string | null;
  pageDecoration?: PlacePageDecoration | null;
};

export type Diary = {
  id: string;
  name: string;
  place: string;
  createdAt: string;
  endedAt?: string | null;
  /** 서버 여행 상태 — recording(촬영) | editing(꾸미기) | completed(완료) */
  status?: 'recording' | 'editing' | 'completed';
  photos: DiaryPhoto[];
  cover?: DiaryCover | null;
  coverDraft?: DiaryCover | null;
  /** 공개 범위 — 임시 저장·종료 직후는 private */
  visibility?: 'public' | 'private';
  /** 장소별 대표 사진 확정 시각 — 없으면 첫 편집(대표 선택) 필요 */
  placesSetupAt?: string | null;
  placeSelections?: DiaryPlaceSelection[] | null;
};

export type SavePlaceSelectionsInput = {
  diaryId: string;
  selections: DiaryPlaceSelection[];
};

export type SavePlacePageDecorationInput = {
  diaryId: string;
  placeId: string;
  decoration: Omit<PlacePageDecoration, 'updatedAt'> | PlacePageDecoration;
};

export type CreateDiaryInput = {
  name: string;
  place: string;
};

export type AddDiaryPhotoInput = {
  diaryId: string;
  uri: string;
  mediaType?: DiaryMediaType;
  placeName?: string | null;
  note?: string;
  latitude: number;
  longitude: number;
  /** TourAPI contentId — 있으면 위치 확정 API 호출 */
  placeContentId?: string | null;
  /** 이미 POST /items 로 만든 서버 기록 id */
  serverItemId?: string | null;
  /** 갤러리에서 가져올 때 — 여행 종료 후에도 추가 허용 */
  allowAfterEnd?: boolean;
};

export type SaveDiaryCoverInput = {
  diaryId: string;
  cover: Omit<DiaryCover, 'updatedAt'> | DiaryCover;
  mode: 'save' | 'draft';
};

export type SavePhotoDecorationInput = {
  diaryId: string;
  photoId: string;
  decoration: Omit<PhotoDecoration, 'updatedAt'> | PhotoDecoration;
};
