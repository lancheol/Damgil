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
  confirmTripItemLocation,
  createTrip,
  changeTripStatus,
  deleteTrip,
  deleteTripItem,
  endTrip,
  getTripTimeline,
  listTrips,
  setTripCover,
  setTripItemDecoration,
  getTripItemDecoration,
  updateTrip,
} from '../api/trips';
import { loadTokens } from '../api/tokenStorage';
import { ApiError, TripStatus } from '../api/types';
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

const DIARIES_STORAGE_KEY = '@damgil/diaries/v1';

type PrepareTripPhotoLocationInput = {
  diaryId: string;
  mediaType?: Diary['photos'][number]['mediaType'];
  latitude: number;
  longitude: number;
  placeName?: string | null;
  placeContentId: string;
  serverItemId?: string | null;
};

type PrepareTripPhotoLocationResult = {
  serverItemId: string;
  latitude: number;
  longitude: number;
  placeName: string | null;
  placeContentId: string;
};

type DiaryContextValue = {
  diaries: Diary[];
  activeDiary: Diary | undefined;
  isReady: boolean;
  createDiary: (input: CreateDiaryInput) => Promise<Diary>;
  deleteDiary: (diaryId: string) => Promise<boolean>;
  addPhotoToDiary: (input: AddDiaryPhotoInput) => Promise<DiaryPhoto | null>;
  prepareTripPhotoLocation: (
    input: PrepareTripPhotoLocationInput,
  ) => Promise<PrepareTripPhotoLocationResult | null>;
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
  savePlacePageDecoration: (input: SavePlacePageDecorationInput) => boolean;
  getDiaryById: (diaryId: string) => Diary | undefined;
  syncDiaryTimeline: (diaryId: string) => Promise<boolean>;
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
  const { isAuthenticated, isReady: authReady } = useAuth();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [isReady, setIsReady] = useState(false);
  const hasMutatedRef = useRef(false);

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
      const trips = await listTrips(tokens.access);
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
      const message =
        error instanceof ApiError ? error.message : '다이어리를 삭제하지 못했어요.';
      Alert.alert('삭제 실패', message);
      return false;
    }

    hasMutatedRef.current = true;
    setDiaries((prev) => prev.filter((diary) => diary.id !== diaryId));
    return true;
  }, [diaries]);

  const prepareTripPhotoLocation = useCallback(
    async (input: PrepareTripPhotoLocationInput) => {
      const target = diaries.find((diary) => diary.id === input.diaryId);
      if (!target || target.endedAt) {
        Alert.alert('위치 확정 실패', '진행 중인 여행에서만 위치를 확정할 수 있어요.');
        return null;
      }

      const placeContentId = input.placeContentId.trim();
      if (!placeContentId) {
        Alert.alert('위치 확정 실패', '장소 정보가 없어 확정할 수 없어요. 다시 검색해 주세요.');
        return null;
      }

      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('위치 확정 실패', '로그인이 필요합니다.');
        return null;
      }

      const mediaType = input.mediaType ?? 'photo';
      const placeName = input.placeName?.trim() || null;
      let serverItemId = input.serverItemId?.trim() || '';
      let latitude = input.latitude;
      let longitude = input.longitude;

      try {
        if (!serverItemId) {
          const clientKey = createId('item');
          const item = await addTripItem(
            tokens.access,
            input.diaryId,
            {
              kind: mediaType === 'video' ? 'video' : 'photo',
              capturedAt: new Date().toISOString(),
              lat: latitude,
              lng: longitude,
              ...(placeName ? { note: placeName.slice(0, 1000) } : {}),
              clientKey,
            },
            clientKey,
          );
          serverItemId = item.id;
          if (typeof item.lat === 'number') {
            latitude = item.lat;
          }
          if (typeof item.lng === 'number') {
            longitude = item.lng;
          }
        }

        const confirmed = await confirmTripItemLocation(
          tokens.access,
          input.diaryId,
          serverItemId,
          placeContentId,
        );

        return {
          serverItemId: confirmed.id || serverItemId,
          // 선택한 TourAPI 장소 좌표를 유지 (서버 item GPS가 stub/오차여도 덮지 않음)
          latitude,
          longitude,
          placeName: placeName || confirmed.note?.trim() || null,
          placeContentId: confirmed.confirmedPlaceContentId || placeContentId,
        };
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : '촬영 위치를 확정하지 못했어요.';
        Alert.alert('위치 확정 실패', message);
        return null;
      }
    },
    [diaries],
  );

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
      let photoId = input.serverItemId?.trim() || createId('photo');
      let placeName = input.placeName?.trim() || null;
      let note = input.note?.trim() || '';
      let latitude = input.latitude;
      let longitude = input.longitude;
      let createdAt = capturedAt;

      // 이미 위치 확정까지 끝난 서버 기록이 있으면 재생성하지 않음
      const alreadySynced = Boolean(input.serverItemId?.trim());
      const shouldSyncRemote = !input.allowAfterEnd && !target.endedAt && !alreadySynced;

      if (shouldSyncRemote) {
        const tokens = await loadTokens();
        if (!tokens?.access) {
          Alert.alert('저장 실패', '로그인이 필요합니다.');
          return null;
        }

        try {
          const item = await addTripItem(
            tokens.access,
            input.diaryId,
            {
              kind: mediaType === 'video' ? 'video' : 'photo',
              capturedAt,
              lat: latitude,
              lng: longitude,
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
            const confirmed = await confirmTripItemLocation(
              tokens.access,
              input.diaryId,
              photoId,
              placeContentId,
            );
            // 확정은 contentId 기록용. 지도 좌표는 검색에서 고른 TourAPI 값을 유지
            if (!input.latitude && typeof confirmed.lat === 'number') {
              latitude = confirmed.lat;
            }
            if (!input.longitude && typeof confirmed.lng === 'number') {
              longitude = confirmed.lng;
            }
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
        const trip = await changeTripStatus(tokens.access, diaryId, {
          status: 'completed',
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
        if (error instanceof ApiError && error.status === 409) {
          // 이미 completed 등 허용되지 않는 전이면 로컬만 맞춤
          hasMutatedRef.current = true;
          setDiaries((prev) =>
            prev.map((diary) =>
              diary.id === diaryId ? { ...diary, status: 'completed' } : diary,
            ),
          );
          return true;
        }
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

      if (input.mode === 'save') {
        const tokens = await loadTokens();
        if (!tokens?.access) {
          Alert.alert('저장 실패', '로그인이 필요합니다.');
          return false;
        }

        try {
          if (titleChanged) {
            await updateTrip(tokens.access, input.diaryId, { title: nextTitle });
          }

          // coverMediaId는 업로드된 media id — 아직 미연동이라 생략
          await setTripCover(tokens.access, input.diaryId, {
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

  const syncDiaryTimeline = useCallback(async (diaryId: string) => {
    const tokens = await loadTokens();
    if (!tokens?.access) {
      return false;
    }

    try {
      const timeline = await getTripTimeline(tokens.access, diaryId);
      hasMutatedRef.current = true;
      setDiaries((prev) => {
        const local = prev.find((diary) => diary.id === diaryId);
        if (!local) {
          return prev;
        }
        const updated = applyTimelineToDiary(timeline, local);
        return prev.map((diary) => (diary.id === diaryId ? normalizeDiary(updated) : diary));
      });
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
      prepareTripPhotoLocation,
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
    }),
    [
      diaries,
      activeDiary,
      isReady,
      createDiary,
      deleteDiary,
      addPhotoToDiary,
      prepareTripPhotoLocation,
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
