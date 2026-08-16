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
  addTripItem,
  autosaveTripEditorState,
  confirmTripItemLocation,
  createTrip,
  changeTripStatus,
  deleteTrip,
  deleteTripItem,
  endTrip,
  getTripTimeline,
  listTrips,
  publishTrip,
  setTripCover,
  setTripItemDecoration,
  getTripItemDecoration,
  getTripEditorState,
  updateTrip,
} from '../api/trips';
import { getMediaDisplayUri, setMediaCrop, uploadMediaFile } from '../api/media';
import { loadTokens } from '../api/tokenStorage';
import { ApiError, TripListItemDto, TripStatus } from '../api/types';
import { useAuth } from './AuthContext';
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
import { resolveRegionIdsFromPlace } from '../utils/tripRegions';
import { mergeTripsWithLocal } from '../utils/tripMapper';
import { applyTimelineToDiary } from '../utils/tripItemMapper';
import { photoDecorationFromItemDto } from '../utils/tripItemDecoration';
import { toDiaryStatus } from '../utils/tripStatus';
import {
  applyEditorDaysToDiary,
  buildEditorStateForDay,
  dayNumberForPlace,
} from '../utils/tripEditorMapper';

const DIARIES_STORAGE_KEY = '@damgil/diaries/v1';

type DiaryContextValue = {
  diaries: Diary[];
  activeDiary: Diary | undefined;
  isReady: boolean;
  createDiary: (input: CreateDiaryInput) => Promise<Diary>;
  deleteDiary: (diaryId: string) => Promise<boolean>;
  addPhotoToDiary: (input: AddDiaryPhotoInput) => Promise<DiaryPhoto | null>;
  removePhotosFromDiary: (diaryId: string, photoIds: string[]) => Promise<boolean>;
  endDiary: (diaryId: string) => Promise<boolean>;
  completeDiary: (diaryId: string) => Promise<boolean>;
  saveDiaryCover: (input: SaveDiaryCoverInput) => Promise<boolean>;
  updateDiaryVisibility: (
    diaryId: string,
    visibility: 'public' | 'private',
  ) => Promise<boolean>;
  discardCoverDraft: (diaryId: string) => boolean;
  savePhotoDecoration: (input: SavePhotoDecorationInput) => Promise<boolean>;
  loadPhotoDecoration: (diaryId: string, photoId: string) => Promise<PhotoDecoration | null>;
  savePlaceSelections: (input: SavePlaceSelectionsInput) => boolean;
  savePlacePageDecoration: (input: SavePlacePageDecorationInput) => Promise<boolean>;
  getDiaryById: (diaryId: string) => Diary | undefined;
  syncDiaryTimeline: (diaryId: string) => Promise<boolean>;
  syncDiaryEditor: (diaryId: string) => Promise<boolean>;
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
    status: toDiaryStatus(
      diary.status ?? (diary.endedAt ? 'editing' : 'recording'),
    ),
    visibility: diary.visibility ?? 'private',
    editStatus: diary.editStatus ?? null,
    updatedAt: diary.updatedAt ?? null,
    likeCount: diary.likeCount ?? 0,
    commentCount: diary.commentCount ?? 0,
    coverThumbUrl: diary.coverThumbUrl ?? null,
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
  return !diary.endedAt && toDiaryStatus(diary.status) === 'recording';
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
  const { isAuthenticated, isReady: authReady } = useAuth();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [isReady, setIsReady] = useState(false);
  const hasMutatedRef = useRef(false);
  const editorRevisionsRef = useRef(new Map<string, number>());

  const loadDiaries = useCallback(async () => {
    let localDiaries: Diary[] = [];

    try {
      const raw = await AsyncStorage.getItem(DIARIES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Diary[];
        if (Array.isArray(parsed)) {
          localDiaries = parsed.map(normalizeDiary);
        }
      }
    } catch {
      // 저장 데이터 손상 시 빈 목록으로 시작
    }

    if (hasMutatedRef.current) {
      return localDiaries;
    }

    if (!isAuthenticated) {
      return localDiaries;
    }

    const tokens = await loadTokens();
    if (!tokens?.access) {
      return localDiaries;
    }

    try {
      const trips: TripListItemDto[] = [];
      let page = 1;
      let hasNext = true;
      while (hasNext) {
        const result = await listTrips(tokens.access, {
          sort: 'updated',
          page,
          pageSize: 20,
        });
        trips.push(...result.items);
        hasNext = result.hasNext;
        page += 1;
      }
      if (hasMutatedRef.current) {
        return localDiaries;
      }
      return (await mergeTripsWithLocal(trips, localDiaries)).map(normalizeDiary);
    } catch {
      return localDiaries;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const nextDiaries = await loadDiaries();
        if (!cancelled && !hasMutatedRef.current) {
          setDiaries(nextDiaries);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    setIsReady(false);
    void load();

    return () => {
      cancelled = true;
    };
  }, [authReady, loadDiaries]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void AsyncStorage.setItem(DIARIES_STORAGE_KEY, JSON.stringify(diaries));
  }, [diaries, isReady]);

  const createDiary = useCallback(async (input: CreateDiaryInput) => {
    const tokens = await loadTokens();
    if (!tokens?.access) {
      throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
    }

    const title = input.name.trim();
    const place = input.place.trim();
    const regionIds = await resolveRegionIdsFromPlace(place);

    const trip = await createTrip(tokens.access, {
      title,
      visibility: 'private',
      ...(regionIds.length > 0 ? { regionIds } : {}),
    });

    const diary: Diary = {
      id: trip.id,
      name: trip.title?.trim() || title,
      place,
      createdAt: trip.startedAt,
      photos: [],
      cover: null,
      coverDraft: null,
      visibility: trip.visibility === 'public' ? 'public' : 'private',
      status: toDiaryStatus(trip.status),
    };

    hasMutatedRef.current = true;
    setDiaries((prev) => [diary, ...prev]);
    return diary;
  }, []);

  const deleteDiary = useCallback(async (diaryId: string) => {
    const exists = diaries.some((diary) => diary.id === diaryId);
    if (!exists) {
      return false;
    }

    // API 연동 전 로컬 id(예: diary-…)는 서버에 없음 → 기기에서만 제거
    const isServerTripId = /^\d+$/.test(diaryId.trim());

    if (isServerTripId) {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('삭제 실패', '로그인이 필요합니다.');
        return false;
      }

      try {
        const result = await deleteTrip(tokens.access, diaryId);
        if (!result.deleted) {
          Alert.alert('삭제 실패', '다이어리를 삭제하지 못했어요.');
          return false;
        }
      } catch (error) {
        // 이미 없거나 소프트삭제된 경우 로컬만 정리
        const notFound = error instanceof ApiError && error.status === 404;
        if (!notFound) {
          const message =
            error instanceof ApiError ? error.message : '다이어리를 삭제하지 못했어요.';
          Alert.alert('삭제 실패', message);
          return false;
        }
      }
    }

    hasMutatedRef.current = true;
    setDiaries((prev) => prev.filter((diary) => diary.id !== diaryId));
    return true;
  }, [diaries]);

  const addPhotoToDiary = useCallback(
    async (input: AddDiaryPhotoInput) => {
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

      const mediaType = input.mediaType ?? 'photo';
      const capturedAt = new Date().toISOString();
      const clientKey = createId('item');
      let photoId = createId('photo');
      let placeName = input.placeName?.trim() || null;
      let note = input.note?.trim() || '';
      let latitude = input.latitude;
      let longitude = input.longitude;
      let createdAt = capturedAt;
      let mediaId: string | null = null;

      const isServerTrip = /^\d+$/.test(input.diaryId);
      const shouldSyncRemote = isServerTrip && !input.allowAfterEnd && !target.endedAt;

      if (isServerTrip) {
        const tokens = await loadTokens();
        if (!tokens?.access) {
          Alert.alert('저장 실패', '로그인이 필요합니다.');
          return null;
        }

        try {
          const uploaded = await uploadMediaFile(tokens.access, {
            uri: input.uri,
            kind: mediaType === 'video' ? 'video' : 'photo',
            sourceType: input.allowAfterEnd ? 'gallery_upload' : 'trip_record',
            tripId: input.diaryId,
          });
          mediaId = uploaded.mediaId;

          if (shouldSyncRemote) {
            const item = await addTripItem(
              tokens.access,
              input.diaryId,
              {
                kind: mediaType === 'video' ? 'video' : 'photo',
                capturedAt,
                lat: latitude,
                lng: longitude,
                mediaId: Number(mediaId),
                ...(placeName || note
                  ? { note: (note || placeName || '').slice(0, 1000) }
                  : {}),
                clientKey,
              },
              clientKey,
            );
            photoId = item.id;
            createdAt = item.capturedAt || capturedAt;
            if (typeof item.lat === 'number') {
              latitude = item.lat;
            }
            if (typeof item.lng === 'number') {
              longitude = item.lng;
            }
            if (item.matchedPlace?.title?.trim()) {
              placeName = placeName || item.matchedPlace.title.trim();
            }
            if (item.note?.trim()) {
              note = item.note.trim();
            }

            const placeContentId = input.placeContentId?.trim();
            if (placeContentId) {
              await confirmTripItemLocation(
                tokens.access,
                input.diaryId,
                photoId,
                placeContentId,
              );
            }
          } else if (input.allowAfterEnd) {
            photoId = `media-${mediaId}`;
          }
        } catch (error) {
          const message =
            error instanceof ApiError ? error.message : '여행 기록을 서버에 저장하지 못했어요.';
          Alert.alert('저장 실패', message);
          return null;
        }
      }

      const photo: DiaryPhoto = {
        id: photoId,
        uri: input.uri,
        mediaType,
        mediaId,
        placeName,
        note,
        latitude,
        longitude,
        placeContentId: input.placeContentId?.trim() || null,
        createdAt,
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
    async (diaryId: string, photoIds: string[]) => {
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

      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('삭제 실패', '로그인이 필요합니다.');
        return false;
      }

      for (const photoId of photoIds) {
        try {
          const result = await deleteTripItem(tokens.access, diaryId, photoId);
          if (!result.deleted) {
            Alert.alert('삭제 실패', '여행 기록을 삭제하지 못했어요.');
            return false;
          }
        } catch (error) {
          // 이미 없는 기록이면 로컬만 정리
          if (!(error instanceof ApiError && error.status === 404)) {
            const message =
              error instanceof ApiError ? error.message : '여행 기록을 삭제하지 못했어요.';
            Alert.alert('삭제 실패', message);
            return false;
          }
        }
      }

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) => {
          if (diary.id !== diaryId) {
            return diary;
          }

          const nextPhotos = (diary.photos ?? []).filter((photo) => !idSet.has(photo.id));
          const nextPlaces = (diary.placeSelections ?? [])
            .filter((place) => !idSet.has(place.representativePhotoId))
            .map((place) => ({
              ...place,
              photoIds: place.photoIds.filter((id) => !idSet.has(id)),
              pageDecoration: place.pageDecoration
                ? {
                    ...place.pageDecoration,
                    photos: (place.pageDecoration.photos ?? []).filter(
                      (layer) => !idSet.has(layer.photoId),
                    ),
                  }
                : place.pageDecoration,
            }));

          return {
            ...diary,
            photos: nextPhotos,
            placeSelections: nextPlaces,
          };
        }),
      );

      return true;
    },
    [diaries],
  );

  const endDiary = useCallback(
    async (diaryId: string) => {
      const target = diaries.find((diary) => diary.id === diaryId);
      if (!target || target.endedAt) {
        return false;
      }

      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('종료 실패', '로그인이 필요합니다.');
        return false;
      }

      let endedAt = new Date().toISOString();
      let visibility: Diary['visibility'] = 'private';
      let status: TripStatus = 'editing';

      try {
        const trip = await endTrip(tokens.access, diaryId);
        endedAt = trip.endedAt?.trim() || endedAt;
        visibility = trip.visibility === 'public' ? 'public' : 'private';
        status = toDiaryStatus(trip.status);

        if (status !== 'editing' && status !== 'completed') {
          const updated = await changeTripStatus(tokens.access, diaryId, {
            status: 'editing',
          });
          status = toDiaryStatus(updated.status);
        }
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : '여행을 종료하지 못했어요.';
        Alert.alert('종료 실패', message);
        return false;
      }

      const selections = buildPlaceSelections(target.photos ?? []);

      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === diaryId
            ? {
                ...diary,
                endedAt,
                visibility,
                status,
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

  const completeDiary = useCallback(
    async (diaryId: string) => {
      const target = diaries.find((diary) => diary.id === diaryId);
      if (!target) {
        return false;
      }
      if (toDiaryStatus(target.status) === 'completed') {
        return true;
      }

      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('완료 실패', '로그인이 필요합니다.');
        return false;
      }

      try {
        const trip = await publishTrip(tokens.access, diaryId, {
          visibility: target.visibility === 'public' ? 'public' : 'private',
        });
        const status = toDiaryStatus(trip.status);
        hasMutatedRef.current = true;
        setDiaries((prev) =>
          prev.map((diary) =>
            diary.id === diaryId
              ? {
                  ...diary,
                  status,
                  endedAt: trip.endedAt ?? diary.endedAt ?? null,
                  visibility: trip.visibility === 'public' ? 'public' : 'private',
                }
              : diary,
          ),
        );
        return true;
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : '여행 완료 처리에 실패했어요.';
        Alert.alert('완료 실패', message);
        return false;
      }
    },
    [diaries],
  );

  const saveDiaryCover = useCallback(
    async (input: SaveDiaryCoverInput) => {
      const target = diaries.find((diary) => diary.id === input.diaryId);
      if (!target) {
        return false;
      }

      const nextCover = withUpdatedAt(input.cover);
      const nextTitle = nextCover.title.trim() || target.name;
      const titleChanged = nextTitle !== target.name.trim();
      let resolvedCoverMediaId: string | null = null;

      if (input.mode === 'save') {
        const tokens = await loadTokens();
        if (!tokens?.access) {
          Alert.alert('저장 실패', '로그인이 필요합니다.');
          return false;
        }

        try {
          const coverPhoto = nextCover.coverPhotoId
            ? target.photos.find((photo) => photo.id === nextCover.coverPhotoId)
            : null;
          resolvedCoverMediaId = coverPhoto?.mediaId ?? null;
          if (coverPhoto && !resolvedCoverMediaId && /^\d+$/.test(input.diaryId)) {
            const uploaded = await uploadMediaFile(tokens.access, {
              uri: coverPhoto.uri,
              kind: coverPhoto.mediaType === 'video' ? 'video' : 'photo',
              sourceType: 'gallery_upload',
              tripId: input.diaryId,
            });
            resolvedCoverMediaId = uploaded.mediaId;
          }

          if (titleChanged) {
            await updateTrip(tokens.access, input.diaryId, { title: nextTitle });
          }

          await setTripCover(tokens.access, input.diaryId, {
            ...(resolvedCoverMediaId
              ? { coverMediaId: Number(resolvedCoverMediaId) }
              : {}),
            titleFont: String(nextCover.fontId).slice(0, 50),
            stickerLayout: {
              title: nextCover.title,
              titleX: nextCover.titleX,
              titleY: nextCover.titleY,
              titleScale: nextCover.titleScale,
              titleRotation: nextCover.titleRotation,
              backgroundColor: nextCover.backgroundColor,
              stickers: nextCover.stickers,
              photos: nextCover.photos,
              texts: nextCover.texts,
              coverPhotoId: nextCover.coverPhotoId,
            },
          });
        } catch (error) {
          const message =
            error instanceof ApiError ? error.message : '표지를 서버에 저장하지 못했어요.';
          Alert.alert('저장 실패', message);
          return false;
        }
      }

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
            name: nextTitle,
            cover: nextCover,
            coverDraft: null,
            visibility: diary.visibility ?? 'private',
            photos: resolvedCoverMediaId
              ? diary.photos.map((photo) =>
                  photo.id === nextCover.coverPhotoId
                    ? { ...photo, mediaId: resolvedCoverMediaId }
                    : photo,
                )
              : diary.photos,
          };
        }),
      );

      return true;
    },
    [diaries],
  );

  const updateDiaryVisibility = useCallback(
    async (diaryId: string, visibility: 'public' | 'private') => {
      const target = diaries.find((diary) => diary.id === diaryId);
      if (!target) {
        return false;
      }

      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('변경 실패', '로그인이 필요합니다.');
        return false;
      }

      try {
        const trip = await updateTrip(tokens.access, diaryId, { visibility });
        const nextVisibility = trip.visibility === 'public' ? 'public' : 'private';
        hasMutatedRef.current = true;
        setDiaries((prev) =>
          prev.map((diary) =>
            diary.id === diaryId
              ? {
                  ...diary,
                  visibility: nextVisibility,
                }
              : diary,
          ),
        );
        return true;
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : '공개 범위를 변경하지 못했어요.';
        Alert.alert('변경 실패', message);
        return false;
      }
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
    async (input: SavePhotoDecorationInput) => {
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

      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('저장 실패', '로그인이 필요합니다.');
        return false;
      }

      try {
        await setTripItemDecoration(tokens.access, input.diaryId, input.photoId, {
          textContent: nextDecoration.note.slice(0, 500),
          font: String(nextDecoration.fontId).slice(0, 50),
          stickerLayout: {
            stickers: nextDecoration.stickers,
            texts: nextDecoration.texts,
            cropRect: nextDecoration.cropRect ?? null,
          },
        });
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : '꾸미기를 서버에 저장하지 못했어요.';
        Alert.alert('저장 실패', message);
        return false;
      }

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

  const loadPhotoDecoration = useCallback(async (diaryId: string, photoId: string) => {
    const tokens = await loadTokens();
    if (!tokens?.access) {
      return null;
    }

    try {
      const dto = await getTripItemDecoration(tokens.access, diaryId, photoId);
      if (!dto) {
        return null;
      }

      const nextDecoration = photoDecorationFromItemDto(dto);
      hasMutatedRef.current = true;
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === diaryId
            ? {
                ...diary,
                photos: (diary.photos ?? []).map((photo) =>
                  photo.id === photoId
                    ? {
                        ...photo,
                        note: nextDecoration.note,
                        decoration: nextDecoration,
                      }
                    : photo,
                ),
              }
            : diary,
        ),
      );
      return nextDecoration;
    } catch {
      // 재진입 복원 실패 시 로컬 편집 상태 유지
      return null;
    }
  }, []);

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
    async (input: SavePlacePageDecorationInput) => {
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
      const nextDiary: Diary = {
        ...target,
        placeSelections: (target.placeSelections ?? []).map((place) =>
          place.id === input.placeId ? { ...place, pageDecoration: next } : place,
        ),
      };

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

      if (!/^\d+$/.test(input.diaryId)) {
        return true;
      }

      const dayNumber = dayNumberForPlace(nextDiary, input.placeId);
      if (!dayNumber) {
        Alert.alert('저장 실패', '이 장소가 속한 여행 일차를 찾지 못했어요.');
        return false;
      }

      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('저장 실패', '로그인이 필요합니다.');
        return false;
      }

      try {
        const revisionKey = `${input.diaryId}:${dayNumber}`;
        let revision = editorRevisionsRef.current.get(revisionKey);
        if (revision == null) {
          const remote = await getTripEditorState(tokens.access, input.diaryId);
          remote.days.forEach((day) => {
            editorRevisionsRef.current.set(
              `${input.diaryId}:${day.dayNumber}`,
              day.revision,
            );
          });
          revision = editorRevisionsRef.current.get(revisionKey) ?? 0;
        }

        await Promise.all(
          next.photos.map(async (layer) => {
            const mediaId = nextDiary.photos.find(
              (photo) => photo.id === layer.photoId,
            )?.mediaId;
            if (!mediaId || !layer.cropRect) return;
            await setMediaCrop(tokens.access, mediaId, {
              ...layer.cropRect,
              scale: layer.scale,
              rotation: layer.rotation,
            });
          }),
        );

        const saved = await autosaveTripEditorState(
          tokens.access,
          input.diaryId,
          {
            dayNumber,
            revision,
            editorState: buildEditorStateForDay(nextDiary, dayNumber),
          },
          createId('editor-save'),
        );
        editorRevisionsRef.current.set(revisionKey, saved.revision);
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.code === 'EDITOR_STATE_CONFLICT' || error.code === 'DIARY_COMPLETED')
        ) {
          const message =
            error.code === 'DIARY_COMPLETED'
              ? '완료된 다이어리는 더 이상 편집할 수 없어요.'
              : '다른 기기에서 변경된 내용을 불러왔어요. 다시 편집해 주세요.';
          if (error.code === 'EDITOR_STATE_CONFLICT') {
            try {
              const remote = await getTripEditorState(tokens.access, input.diaryId);
              remote.days.forEach((day) => {
                editorRevisionsRef.current.set(
                  `${input.diaryId}:${day.dayNumber}`,
                  day.revision,
                );
              });
              setDiaries((prev) =>
                prev.map((diary) =>
                  diary.id === input.diaryId
                    ? applyEditorDaysToDiary(diary, remote.days)
                    : diary,
                ),
              );
            } catch {
              // 원래 충돌 안내를 유지한다.
            }
          }
          Alert.alert('저장 충돌', message);
          return false;
        }
        const message =
          error instanceof ApiError ? error.message : '편집 내용을 서버에 저장하지 못했어요.';
        Alert.alert('저장 실패', message);
        return false;
      }
      return true;
    },
    [diaries],
  );

  const getDiaryById = useCallback(
    (diaryId: string) => diaries.find((diary) => diary.id === diaryId),
    [diaries],
  );

  const syncDiaryTimeline = useCallback(async (diaryId: string) => {
    const tokens = await loadTokens();
    if (!tokens?.access) {
      return false;
    }

    try {
      const timeline = await getTripTimeline(tokens.access, diaryId);
      const mediaEntries = await Promise.all(
        timeline.items.map(async (item) => {
          if (!item.mediaId) return [item.id, null] as const;
          try {
            return [
              item.id,
              await getMediaDisplayUri(tokens.access, item.mediaId),
            ] as const;
          } catch {
            return [item.id, null] as const;
          }
        }),
      );
      const mediaUrisByItemId = Object.fromEntries(mediaEntries);
      hasMutatedRef.current = true;
      setDiaries((prev) => {
        const local = prev.find((diary) => diary.id === diaryId);
        if (!local) {
          return prev;
        }
        const updated = applyTimelineToDiary(timeline, local, mediaUrisByItemId);
        return prev.map((diary) => (diary.id === diaryId ? normalizeDiary(updated) : diary));
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const syncDiaryEditor = useCallback(async (diaryId: string) => {
    if (!/^\d+$/.test(diaryId)) return true;
    const tokens = await loadTokens();
    if (!tokens?.access) return false;

    try {
      const remote = await getTripEditorState(tokens.access, diaryId);
      remote.days.forEach((day) => {
        editorRevisionsRef.current.set(`${diaryId}:${day.dayNumber}`, day.revision);
      });
      setDiaries((prev) =>
        prev.map((diary) =>
          diary.id === diaryId ? applyEditorDaysToDiary(diary, remote.days) : diary,
        ),
      );
      return true;
    } catch {
      return false;
    }
  }, []);

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
      completeDiary,
      saveDiaryCover,
      updateDiaryVisibility,
      discardCoverDraft,
      savePhotoDecoration,
      loadPhotoDecoration,
      savePlaceSelections,
      savePlacePageDecoration,
      getDiaryById,
      syncDiaryTimeline,
      syncDiaryEditor,
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
      completeDiary,
      saveDiaryCover,
      updateDiaryVisibility,
      discardCoverDraft,
      savePhotoDecoration,
      loadPhotoDecoration,
      savePlaceSelections,
      savePlacePageDecoration,
      getDiaryById,
      syncDiaryTimeline,
      syncDiaryEditor,
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
