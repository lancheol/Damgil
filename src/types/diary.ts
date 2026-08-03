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

export type CoverFontId = DecorFontId;
export type CoverSticker = DecorSticker;

export type DiaryCover = {
  coverPhotoId: string | null;
  title: string;
  fontId: DecorFontId;
  stickers: DecorSticker[];
  updatedAt: string;
};

/** 원본 미디어 위 별도 레이어 (원본 uri는 교체하지 않음) */
export type PhotoDecoration = {
  stickers: DecorSticker[];
  note: string;
  fontId: DecorFontId;
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
  createdAt: string;
  decoration?: PhotoDecoration | null;
};

export type Diary = {
  id: string;
  name: string;
  place: string;
  createdAt: string;
  endedAt?: string | null;
  photos: DiaryPhoto[];
  cover?: DiaryCover | null;
  coverDraft?: DiaryCover | null;
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
