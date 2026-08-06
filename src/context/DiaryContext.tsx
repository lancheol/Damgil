import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';

import {
  AddDiaryPhotoInput,
  CreateDiaryInput,
  Diary,
  DiaryCover,
  DiaryPhoto,
  PhotoDecoration,
  SaveDiaryCoverInput,
  SavePhotoDecorationInput,
  SavePlaceSelectionsInput,
  SavePlacePageDecorationInput,
} from '../types/diary';
import { normalizeCover } from '../utils/diaryCover';
import { buildPlaceSelections } from '../utils/diaryPlaces';
import { buildPlacePageDecoration, normalizePlacePageDecoration } from '../utils/diaryPageDecoration';
import { buildPhotoDecoration, resolveDecorationTexts } from '../utils/diaryTextLayers';

const DIARIES_STORAGE_KEY = '@damgil/diaries/v1';

type DiaryContextValue = {
  diaries: Diary[];
  activeDiary: Diary | undefined;
  isReady: boolean;
  createDiary: (input: CreateDiaryInput) => Diary;
  deleteDiary: (diaryId: string) => boolean;
  addPhotoToDiary: (input: AddDiaryPhotoInput) => DiaryPhoto | null;
  removePhotosFromDiary: (diaryId: string, photoIds: string[]) => boolean;
  endDiary: (diaryId: string) => boolean;
  saveDiaryCover: (input: SaveDiaryCoverInput) => boolean;
  discardCoverDraft: (diaryId: string) => boolean;
  savePhotoDecoration: (input: SavePhotoDecorationInput) => boolean;
  savePlaceSelections: (input: SavePlaceSelectionsInput) => boolean;
  savePlacePageDecoration: (input: SavePlacePageDecorationInput) => boolean;
  getDiaryById: (diaryId: string) => Diary | undefined;
};

const DiaryContext = createContext<DiaryContextValue | null>(null);

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDecoration(decoration: PhotoDecoration | null | undefined): PhotoDecoration | null {
  if (!decoration) {
    return null;
  }
  const texts = resolveDecorationTexts(decoration);
  const built = buildPhotoDecoration({
    stickers: Array.isArray(decoration.stickers) ? decoration.stickers : [],
    texts,
    cropRect: decoration.cropRect,
  });
  return {
    ...built,
    updatedAt: decoration.updatedAt ?? built.updatedAt,
  };
}

function normalizeDiary(diary: Diary): Diary {
  return {
    ...diary,
    endedAt: diary.endedAt ?? null,
    visibility: diary.visibility ?? 'private',
    placesSetupAt: diary.placesSetupAt ?? null,
    placeSelections: Array.isArray(diary.placeSelections)
      ? diary.placeSelections.map((selection) => ({
          ...selection,
          pageDecoration: selection.pageDecoration
            ? normalizePlacePageDecoration(
                selection.pageDecoration,
                selection.representativePhotoId,
              )
            : null,
        }))
      : null,
    cover: normalizeCover(diary.cover, diary.name),
    coverDraft: normalizeCover(diary.coverDraft, diary.name),
    photos: Array.isArray(diary.photos)
      ? diary.photos.map((photo) => ({
          ...photo,
          mediaType: photo.mediaType ?? 'photo',
          placeName: photo.placeName ?? null,
          note: photo.note ?? '',
          decoration: normalizeDecoration(photo.decoration),
        }))
      : [],
  };
}

function isActiveDiary(diary: Diary): boolean {
  return !diary.endedAt;
}

function withUpdatedAt(cover: Omit<DiaryCover, 'updatedAt'> | DiaryCover): DiaryCover {
  return {
    ...cover,
    title: cover.title.trim(),
    stickers: cover.stickers ?? [],
    photos: Array.isArray(cover.photos) ? cover.photos : [],
    texts: Array.isArray(cover.texts) ? cover.texts : [],
    updatedAt: new Date().toISOString(),
  };
}

export function DiaryProvider({ children }: PropsWithChildren) {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [isReady, setIsReady] = useState(false);
  const hasMutatedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(DIARIES_STORAGE_KEY);
        if (!raw || cancelled || hasMutatedRef.current) {
          return;
        }

        const parsed = JSON.parse(raw) as Diary[];
        if (Array.isArray(parsed) && !hasMutatedRef.current) {
          setDiaries(parsed.map(normalizeDiary));
        }
      } catch {
        // 저장 데이터 손상 시 빈 목록으로 시작
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void AsyncStorage.setItem(DIARIES_STORAGE_KEY, JSON.stringify(diaries));
  }, [diaries, isReady]);

  const createDiary = useCallback((input: CreateDiaryInput) => {
    const diary: Diary = {
      id: createId('diary'),
      name: input.name.trim(),
      place: input.place.trim(),
      createdAt: new Date().toISOString(),
      photos: [],
      cover: null,
      coverDraft: null,
      visibility: 'private',
    };

    hasMutatedRef.current = true;
    setDiaries((prev) => [diary, ...prev]);
    return diary;
  }, []);

  const deleteDiary = useCallback(
    (diaryId: string) => {
      const exists = diaries.some((diary) => diary.id === diaryId);
      if (!exists) {
        return false;
      }

      hasMutatedRef.current = true;
      setDiaries((prev) => prev.filter((diary) => diary.id !== diaryId));
      return true;
    },
    [diaries],
  );

  const addPhotoToDiary = useCallback(
    (input: AddDiaryPhotoInput) => {
      const target = diaries.find((diary) => diary.id === input.diaryId);
      if (!target) {
        Alert.alert(
          '저장 실패',
          '다이어리를 찾지 못해 사진을 저장하지 못했습니다. 홈에서 다이어리를 다시 만든 뒤 촬영해 주세요.',
        );
        return null;
      }
      if (target.endedAt && !input.allowAfterEnd) {
        Alert.alert(
          '저장 실패',
          '종료된 여행에는 새 촬영물을 추가할 수 없어요. 꾸미기에서 갤러리 사진을 사용해 주세요.',
        );
        return null;
      }

      const photo: DiaryPhoto = {
        id: createId('photo'),
        uri: input.uri,
        mediaType: input.mediaType ?? 'photo',
        placeName: input.placeName?.trim() || null,
        note: input.note?.trim() || '',
        latitude: input.latitude,
        longitude: input.longitude,
        createdAt: new Date().toISOString(),
      };

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === input.diaryId
            ? {
                ...diary,
                photos: [photo, ...(diary.photos ?? [])],
              }
            : diary,
        ),
      );

      return photo;
    },
    [diaries],
  );

  const removePhotosFromDiary = useCallback(
    (diaryId: string, photoIds: string[]) => {
      if (photoIds.length === 0) {
        return false;
      }

      const target = diaries.find((diary) => diary.id === diaryId);
      if (!target) {
        return false;
      }

      const idSet = new Set(photoIds);
      const hadMatch = (target.photos ?? []).some((photo) => idSet.has(photo.id));
      if (!hadMatch) {
        return false;
      }

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === diaryId
            ? {
                ...diary,
                photos: (diary.photos ?? []).filter((photo) => !idSet.has(photo.id)),
              }
            : diary,
        ),
      );

      return true;
    },
    [diaries],
  );

  const endDiary = useCallback(
    (diaryId: string) => {
      const target = diaries.find((diary) => diary.id === diaryId);
      if (!target || target.endedAt) {
        return false;
      }

      const selections = buildPlaceSelections(target.photos ?? []);

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === diaryId
            ? {
                ...diary,
                endedAt: new Date().toISOString(),
                visibility: 'private',
                placeSelections: selections,
                placesSetupAt: selections.length > 0 ? new Date().toISOString() : null,
              }
            : diary,
        ),
      );

      return true;
    },
    [diaries],
  );

  const saveDiaryCover = useCallback(
    (input: SaveDiaryCoverInput) => {
      const target = diaries.find((diary) => diary.id === input.diaryId);
      if (!target) {
        return false;
      }

      const nextCover = withUpdatedAt(input.cover);
      hasMutatedRef.current = true;

      setDiaries((prev) =>
        prev.map((diary) => {
          if (diary.id !== input.diaryId) {
            return diary;
          }

          if (input.mode === 'draft') {
            return {
              ...diary,
              coverDraft: nextCover,
              visibility: 'private',
            };
          }

          return {
            ...diary,
            name: nextCover.title.trim() || diary.name,
            cover: nextCover,
            coverDraft: null,
            visibility: diary.visibility ?? 'private',
          };
        }),
      );

      return true;
    },
    [diaries],
  );

  const discardCoverDraft = useCallback(
    (diaryId: string) => {
      const target = diaries.find((diary) => diary.id === diaryId);
      if (!target) {
        return false;
      }

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === diaryId
            ? {
                ...diary,
                coverDraft: null,
              }
            : diary,
        ),
      );
      return true;
    },
    [diaries],
  );

  const savePhotoDecoration = useCallback(
    (input: SavePhotoDecorationInput) => {
      const target = diaries.find((diary) => diary.id === input.diaryId);
      if (!target) {
        return false;
      }

      const photoExists = (target.photos ?? []).some((photo) => photo.id === input.photoId);
      if (!photoExists) {
        return false;
      }

      const texts = resolveDecorationTexts({
        texts: input.decoration.texts,
        note: input.decoration.note,
        fontId: input.decoration.fontId,
      });
      const nextDecoration = buildPhotoDecoration({
        stickers: input.decoration.stickers ?? [],
        texts,
        cropRect: input.decoration.cropRect,
      });

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === input.diaryId
            ? {
                ...diary,
                photos: (diary.photos ?? []).map((photo) =>
                  photo.id === input.photoId
                    ? {
                        ...photo,
                        // 원본 uri/mediaType은 유지, 레이어만 갱신
                        note: nextDecoration.note,
                        decoration: nextDecoration,
                      }
                    : photo,
                ),
              }
            : diary,
        ),
      );

      return true;
    },
    [diaries],
  );

  const savePlaceSelections = useCallback(
    (input: SavePlaceSelectionsInput) => {
      const target = diaries.find((diary) => diary.id === input.diaryId);
      if (!target || !target.endedAt) {
        return false;
      }
      if (!input.selections.length) {
        return false;
      }
      const incomplete = input.selections.some(
        (s) => !s.representativePhotoId || !s.photoIds.includes(s.representativePhotoId),
      );
      if (incomplete) {
        return false;
      }

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === input.diaryId
            ? {
                ...diary,
                placeSelections: input.selections,
                placesSetupAt: new Date().toISOString(),
              }
            : diary,
        ),
      );
      return true;
    },
    [diaries],
  );

  const savePlacePageDecoration = useCallback(
    (input: SavePlacePageDecorationInput) => {
      const target = diaries.find((diary) => diary.id === input.diaryId);
      if (!target) {
        return false;
      }
      const placeExists = (target.placeSelections ?? []).some(
        (place) => place.id === input.placeId,
      );
      if (!placeExists) {
        return false;
      }

      const next = buildPlacePageDecoration({
        photos: input.decoration.photos ?? [],
        stickers: input.decoration.stickers ?? [],
        texts: input.decoration.texts ?? [],
      });

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === input.diaryId
            ? {
                ...diary,
                placeSelections: (diary.placeSelections ?? []).map((place) =>
                  place.id === input.placeId
                    ? {
                        ...place,
                        pageDecoration: next,
                      }
                    : place,
                ),
              }
            : diary,
        ),
      );
      return true;
    },
    [diaries],
  );

  const getDiaryById = useCallback(
    (diaryId: string) => diaries.find((diary) => diary.id === diaryId),
    [diaries],
  );

  const activeDiary = useMemo(() => diaries.find(isActiveDiary), [diaries]);

  const value = useMemo(
    () => ({
      diaries,
      activeDiary,
      isReady,
      createDiary,
      deleteDiary,
      addPhotoToDiary,
      removePhotosFromDiary,
      endDiary,
      saveDiaryCover,
      discardCoverDraft,
      savePhotoDecoration,
      savePlaceSelections,
      savePlacePageDecoration,
      getDiaryById,
    }),
    [
      diaries,
      activeDiary,
      isReady,
      createDiary,
      deleteDiary,
      addPhotoToDiary,
      removePhotosFromDiary,
      endDiary,
      saveDiaryCover,
      discardCoverDraft,
      savePhotoDecoration,
      savePlaceSelections,
      savePlacePageDecoration,
      getDiaryById,
    ],
  );

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiaries(): DiaryContextValue {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error('useDiaries must be used within DiaryProvider');
  }
  return context;
}
