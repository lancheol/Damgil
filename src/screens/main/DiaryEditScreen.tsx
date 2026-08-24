import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { CoverCanvas } from '../../components/diary/CoverCanvas';
import { DiaryCommentsSheet } from '../../components/diary/DiaryCommentsSheet';
import { DiaryPageCanvas } from '../../components/diary/DiaryPageCanvas';
import { DiarySocialDock } from '../../components/diary/DiarySocialDock';
import { PhotoCropModal } from '../../components/diary/PhotoCropModal';
import { HomeBookShell } from '../../components/home/HomeBookShell';
import { useDiaries } from '../../context/DiaryContext';
import { listSavedPlaces, savePlace, unsavePlace } from '../../api/saves';
import { toggleTripLike } from '../../api/social';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError } from '../../api/types';
import { RootStackParamList } from '../../navigation/types';
import {
  DecorFontId,
  DecorPhotoLayer,
  DecorSticker,
  DecorTextLayer,
  DiaryPlaceSelection,
} from '../../types/diary';
import {
  createStickerId,
  DECOR_FONTS,
  DECOR_STICKER_EMOJIS,
  DECOR_TEXT_COLORS,
  DEFAULT_DECOR_TEXT_COLOR,
} from '../../utils/decorAssets';
import {
  buildPlacePageDecoration,
  createDefaultPhotoLayer,
  normalizePlacePageDecoration,
} from '../../utils/diaryPageDecoration';
import { indexPhotosById } from '../../utils/diaryPhotos';
import {
  buildPlaceSelections,
  isPlacesSetupComplete,
} from '../../utils/diaryPlaces';
import { createTextLayer } from '../../utils/diaryTextLayers';
import { buildDiaryTimeline } from '../../utils/diaryTimeline';
import {
  getCoverBackgroundColor,
  getEffectiveCover,
  resolveCoverTitleColor,
} from '../../utils/diaryCover';
import { isDiaryPublished } from '../../utils/tripStatus';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryEdit'>;
type ToolSheet = 'none' | 'sticker' | 'text';

type HitRect = { x: number; y: number; width: number; height: number };

function getFontInputStyle(fontId: DecorFontId) {
  return DECOR_FONTS.find((font) => font.id === fontId)?.style;
}

export function DiaryEditScreen({ navigation, route }: Props) {
  const { diaryId } = route.params;
  const insets = useSafeAreaInsets();
  const { getDiaryById, savePlaceSelections, savePlacePageDecoration, addPhotoToDiary, syncDiaryTimeline, syncDiaryEditor, completeDiary, removePhotosFromDiary } =
    useDiaries();
  const diary = getDiaryById(diaryId);
  const isRepublish = Boolean(route.params.republish);
  const readOnly =
    route.params.mode === 'view' ||
    (route.params.mode !== 'edit' && isDiaryPublished(diary));

  const [liked, setLiked] = useState(Boolean(route.params.liked));
  const [likeCount, setLikeCount] = useState(
    route.params.likeCount ?? diary?.likeCount ?? 0,
  );
  const [commentCount, setCommentCount] = useState(
    route.params.commentCount ?? diary?.commentCount ?? 0,
  );
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);
  const [placeSaveBusy, setPlaceSaveBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      await syncDiaryTimeline(diaryId);
      await syncDiaryEditor(diaryId);
    })();
  }, [diaryId, syncDiaryTimeline, syncDiaryEditor]);

  useEffect(() => {
    if (!readOnly) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const tokens = await loadTokens();
      if (!tokens?.access || cancelled) return;
      try {
        const saves = await listSavedPlaces(tokens.access);
        if (!cancelled) {
          setSavedPlaceIds(saves.map((item) => item.contentId));
        }
      } catch {
        // 찜 상태 동기화 실패는 조용히 무시
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOnly, diaryId]);

  useEffect(() => {
    if (route.params.likeCount != null) {
      setLikeCount(route.params.likeCount);
    } else if (diary?.likeCount != null) {
      setLikeCount(diary.likeCount);
    }
    if (route.params.commentCount != null) {
      setCommentCount(route.params.commentCount);
    } else if (diary?.commentCount != null) {
      setCommentCount(diary.commentCount);
    }
    if (route.params.liked != null) {
      setLiked(Boolean(route.params.liked));
    } else if (diary?.liked != null) {
      setLiked(Boolean(diary.liked));
    }
  }, [
    diary?.commentCount,
    diary?.likeCount,
    diary?.liked,
    route.params.commentCount,
    route.params.likeCount,
    route.params.liked,
  ]);

  useEffect(() => {
    if (!diary || !diary.endedAt) {
      return;
    }
    if (isPlacesSetupComplete(diary)) {
      return;
    }
    const selections = buildPlaceSelections(diary.photos ?? []);
    if (selections.length > 0) {
      savePlaceSelections({ diaryId, selections });
    }
  }, [diary, diaryId, savePlaceSelections]);

  const timeline = useMemo(() => (diary ? buildDiaryTimeline(diary) : []), [diary]);
  const coverColor = useMemo(
    () => (diary ? getCoverBackgroundColor(getEffectiveCover(diary)) : undefined),
    [diary],
  );
  const photoById = useMemo(() => indexPhotosById(diary?.photos), [diary?.photos]);
  const viewCover = useMemo(() => getEffectiveCover(diary), [diary]);
  const [viewingCover, setViewingCover] = useState(false);

  useEffect(() => {
    // 읽기 모드에서는 표지 꾸미기를 먼저 보여 줌
    if (readOnly) {
      setViewingCover(true);
    }
  }, [readOnly, diaryId]);

  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!timeline.length) {
      setActiveDayKey(null);
      return;
    }
    if (!timeline.some((g) => g.dateKey === activeDayKey)) {
      setActiveDayKey(timeline[0].dateKey);
    }
  }, [timeline, activeDayKey]);

  const activeDay = useMemo(
    () => timeline.find((g) => g.dateKey === activeDayKey) ?? timeline[0] ?? null,
    [timeline, activeDayKey],
  );

  const dayPlaces = useMemo(() => {
    if (!diary || !activeDay) {
      return [] as DiaryPlaceSelection[];
    }
    const dayPhotoIds = new Set(activeDay.records.map((item) => item.id));
    const selections = diary.placeSelections ?? [];
    if (selections.length > 0) {
      return selections.filter(
        (place) =>
          dayPhotoIds.has(place.representativePhotoId) ||
          place.photoIds.some((id) => dayPhotoIds.has(id)),
      );
    }
    // 공개(게스트) 다이어리 등 placeSelections가 없을 때 일차 기록으로 장소 구성
    return buildPlaceSelections(activeDay.records);
  }, [diary, activeDay]);

  const activePlace = useMemo(
    () => dayPlaces.find((place) => place.id === activePlaceId) ?? dayPlaces[0] ?? null,
    [dayPlaces, activePlaceId],
  );

  const [photos, setPhotos] = useState<DecorPhotoLayer[]>([]);
  const [stickers, setStickers] = useState<DecorSticker[]>([]);
  const [texts, setTexts] = useState<DecorTextLayer[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [draggingLayer, setDraggingLayer] = useState(false);
  const [trashHot, setTrashHot] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sheet, setSheet] = useState<ToolSheet>('none');
  const [cropOpen, setCropOpen] = useState(false);

  const [draftText, setDraftText] = useState('');
  const [draftFontId, setDraftFontId] = useState<DecorFontId>('sans');
  const [draftColor, setDraftColor] = useState<string>(DEFAULT_DECOR_TEXT_COLOR);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const trashHotRef = useRef(false);
  const deleteHitRef = useRef<HitRect>({ x: 0, y: 0, width: 0, height: 0 });
  const deleteChipRef = useRef<View>(null);
  const loadedPlaceIdRef = useRef<string | null>(null);
  const loadedDecorationKeyRef = useRef<string | null>(null);
  const photosRef = useRef(photos);
  const stickersRef = useRef(stickers);
  const textsRef = useRef(texts);
  const dirtyRef = useRef(dirty);
  const activePlaceRef = useRef(activePlace);
  photosRef.current = photos;
  stickersRef.current = stickers;
  textsRef.current = texts;
  dirtyRef.current = dirty;
  activePlaceRef.current = activePlace;

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  const persistCurrent = useCallback(async () => {
    if (readOnly) {
      return true;
    }
    const place = activePlaceRef.current;
    if (!place) {
      return true;
    }
    const ok = await savePlacePageDecoration({
      diaryId,
      placeId: place.id,
      decoration: buildPlacePageDecoration({
        photos: photosRef.current,
        stickers: stickersRef.current,
        texts: textsRef.current,
      }),
    });
    if (ok) {
      dirtyRef.current = false;
      setDirty(false);
    }
    return ok;
  }, [diaryId, readOnly, savePlacePageDecoration]);

  const placesForDayKey = useCallback(
    (dateKey: string) => {
      if (!diary) {
        return [] as DiaryPlaceSelection[];
      }
      const day = timeline.find((group) => group.dateKey === dateKey);
      if (!day) {
        return [] as DiaryPlaceSelection[];
      }
      const dayPhotoIds = new Set(day.records.map((item) => item.id));
      return (diary.placeSelections ?? []).filter(
        (place) =>
          dayPhotoIds.has(place.representativePhotoId) ||
          place.photoIds.some((id) => dayPhotoIds.has(id)),
      );
    },
    [diary, timeline],
  );

  useEffect(() => {
    if (!dayPlaces.length) {
      if (dirtyRef.current) {
        void persistCurrent();
      }
      setActivePlaceId(null);
      return;
    }
    if (!dayPlaces.some((place) => place.id === activePlaceId)) {
      if (dirtyRef.current) {
        void persistCurrent();
      }
      loadedPlaceIdRef.current = null;
      setActivePlaceId(dayPlaces[0].id);
    }
  }, [dayPlaces, activePlaceId, persistCurrent]);

  useEffect(() => {
    if (!activePlace) {
      setPhotos([]);
      setStickers([]);
      setTexts([]);
      loadedPlaceIdRef.current = null;
      loadedDecorationKeyRef.current = null;
      return;
    }
    const saved =
      diary?.placeSelections?.find((place) => place.id === activePlace.id)?.pageDecoration ??
      activePlace.pageDecoration;
    const decorationKey = [
      activePlace.id,
      saved?.updatedAt ?? '',
      activePlace.photoIds.join(','),
      saved?.photos?.map((layer) => layer.photoId).join(',') ?? '',
    ].join('|');
    if (
      loadedPlaceIdRef.current === activePlace.id &&
      loadedDecorationKeyRef.current === decorationKey
    ) {
      return;
    }
    const next = normalizePlacePageDecoration(
      saved,
      activePlace.representativePhotoId,
      activePlace.photoIds,
    );
    setPhotos(next.photos);
    setStickers(next.stickers);
    setTexts(next.texts);
    setSelectedPhotoId(next.photos[0]?.id ?? null);
    setSelectedStickerId(null);
    setSelectedTextId(null);
    dirtyRef.current = false;
    setDirty(false);
    setSheet('none');
    loadedPlaceIdRef.current = activePlace.id;
    loadedDecorationKeyRef.current = decorationKey;
  }, [activePlace, diary?.placeSelections]);

  const selectPlace = async (placeId: string) => {
    if (placeId === activePlaceId) {
      return;
    }
    if (dirtyRef.current) {
      const ok = await persistCurrent();
      if (!ok) {
        Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
        return;
      }
    }
    loadedPlaceIdRef.current = null;
    setActivePlaceId(placeId);
  };

  const selectDay = async (dateKey: string) => {
    if (dateKey === activeDayKey) {
      return;
    }
    if (dirtyRef.current) {
      const ok = await persistCurrent();
      if (!ok) {
        Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
        return;
      }
    }

    const nextPlaces = placesForDayKey(dateKey);
    const currentId = activePlaceRef.current?.id ?? activePlaceId;
    if (nextPlaces.length > 0 && !nextPlaces.some((place) => place.id === currentId)) {
      loadedPlaceIdRef.current = null;
      setActivePlaceId(nextPlaces[0].id);
    }
    setActiveDayKey(dateKey);
  };

  const measureDeleteChip = useCallback(() => {
    deleteChipRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        deleteHitRef.current = { x, y, width, height };
      }
    });
  }, []);

  const shouldDeleteAtPoint = (pageX: number, pageY: number) => {
    const hit = deleteHitRef.current;
    return (
      pageX >= hit.x &&
      pageX <= hit.x + hit.width &&
      pageY >= hit.y &&
      pageY <= hit.y + hit.height
    );
  };

  const setTrashHotState = (hot: boolean) => {
    trashHotRef.current = hot;
    setTrashHot(hot);
  };

  const clearSelection = () => {
    setSelectedPhotoId(null);
    setSelectedStickerId(null);
    setSelectedTextId(null);
  };

  const selectedPhotoLayer = photos.find((item) => item.id === selectedPhotoId) ?? null;

  const addPhotoLayer = (photoId: string) => {
    const offset = photos.length * 0.04;
    const layer = createDefaultPhotoLayer(photoId, {
      x: Math.min(0.7, 0.5 + offset),
      y: Math.min(0.7, 0.4 + offset),
      scale: 0.68,
    });
    setPhotos((prev) => [...prev, layer]);
    setSelectedPhotoId(layer.id);
    setSelectedStickerId(null);
    setSelectedTextId(null);
    markDirty();
  };

  const pickPhotoFromLibrary = async () => {
    if (!activePlace) {
      Alert.alert('사진 추가', '장소를 먼저 선택해 주세요.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        '사진 권한 필요',
        '갤러리에서 사진을 가져오려면 사진 접근을 허용해 주세요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '설정 열기',
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const asset = result.assets[0];
    const saved = await addPhotoToDiary({
      diaryId,
      uri: asset.uri,
      mediaType: 'photo',
      placeName: activePlace.placeName,
      latitude: activePlace.latitude,
      longitude: activePlace.longitude,
      allowAfterEnd: true,
    });

    if (!saved) {
      return;
    }

    addPhotoLayer(saved.id);
  };

  const openTextTool = () => {
    clearSelection();
    setEditingTextId(null);
    setDraftText('');
    setDraftFontId('sans');
    setDraftColor(DEFAULT_DECOR_TEXT_COLOR);
    setSheet('text');
  };

  const openEditText = (id: string) => {
    const target = texts.find((item) => item.id === id);
    if (!target) {
      return;
    }
    setSelectedPhotoId(null);
    setSelectedStickerId(null);
    setSelectedTextId(id);
    setEditingTextId(id);
    setDraftText(target.content);
    setDraftFontId(target.fontId);
    setDraftColor(target.color ?? DEFAULT_DECOR_TEXT_COLOR);
    setSheet('text');
  };

  const commitTextDraft = () => {
    const content = draftText.trim();
    if (!content) {
      if (editingTextId) {
        setTexts((prev) => prev.filter((item) => item.id !== editingTextId));
        setSelectedTextId(null);
        markDirty();
      }
      setEditingTextId(null);
      setSheet('none');
      return;
    }
    if (editingTextId) {
      setTexts((prev) =>
        prev.map((item) =>
          item.id === editingTextId
            ? { ...item, content, fontId: draftFontId, color: draftColor }
            : item,
        ),
      );
      setSelectedTextId(editingTextId);
    } else {
      const layer = createTextLayer(content, draftFontId, {
        x: 0.5,
        y: 0.7,
        color: draftColor,
      });
      setTexts((prev) => [...prev, layer]);
      setSelectedTextId(layer.id);
    }
    setEditingTextId(null);
    setSheet('none');
    markDirty();
  };

  const addSticker = (emoji: string) => {
    const sticker: DecorSticker = {
      id: createStickerId('page'),
      emoji,
      x: 0.22,
      y: 0.28,
      scale: 1,
      rotation: 0,
    };
    setStickers((prev) => [...prev, sticker]);
    setSelectedStickerId(sticker.id);
    setSelectedPhotoId(null);
    setSelectedTextId(null);
    setSheet('none');
    markDirty();
  };

  const finishDelete = (
    type: 'photo' | 'sticker' | 'text',
    id: string,
    shouldDelete: boolean,
  ) => {
    if (!shouldDelete) {
      setTrashHotState(false);
      setDraggingLayer(false);
      return;
    }

    if (type === 'sticker') {
      setStickers((prev) => prev.filter((item) => item.id !== id));
      setSelectedStickerId(null);
      markDirty();
      setTrashHotState(false);
      setDraggingLayer(false);
      return;
    }

    if (type === 'text') {
      setTexts((prev) => prev.filter((item) => item.id !== id));
      setSelectedTextId(null);
      markDirty();
      setTrashHotState(false);
      setDraggingLayer(false);
      return;
    }

    const layer = photosRef.current.find((item) => item.id === id);
    const photoId = layer?.photoId;
    const isRepresentative =
      Boolean(photoId) && activePlaceRef.current?.representativePhotoId === photoId;

    const removeLayerOnly = () => {
      setPhotos((prev) => prev.filter((item) => item.id !== id));
      setSelectedPhotoId(null);
      markDirty();
      setTrashHotState(false);
      setDraggingLayer(false);
    };

    if (!photoId || !isRepresentative) {
      removeLayerOnly();
      return;
    }

    Alert.alert(
      '기록 삭제',
      '대표 사진을 지우면 이번 기록은 사라져요. 그래도 지울까요?',
      [
        {
          text: '아니오',
          style: 'cancel',
          onPress: () => {
            setTrashHotState(false);
            setDraggingLayer(false);
          },
        },
        {
          text: '네',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const ok = await removePhotosFromDiary(diaryId, [photoId]);
              if (!ok) {
                setTrashHotState(false);
                setDraggingLayer(false);
                return;
              }
              setPhotos((prev) => prev.filter((item) => item.photoId !== photoId));
              setSelectedPhotoId(null);
              dirtyRef.current = false;
              setDirty(false);
              setTrashHotState(false);
              setDraggingLayer(false);
            })();
          },
        },
      ],
    );
  };

  const handleDragEnd = (
    type: 'photo' | 'sticker' | 'text',
    id: string,
    pageX?: number,
    pageY?: number,
  ) => {
    if (typeof pageX !== 'number' || typeof pageY !== 'number') {
      finishDelete(type, id, trashHotRef.current);
      return;
    }
    const node = deleteChipRef.current;
    if (!node) {
      finishDelete(type, id, shouldDeleteAtPoint(pageX, pageY));
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        deleteHitRef.current = { x, y, width, height };
      }
      finishDelete(type, id, shouldDeleteAtPoint(pageX, pageY));
    });
  };

  const handleDone = () => {
    if (readOnly) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      isRepublish ? '수정 완료' : '다이어리 게시',
      isRepublish
        ? '완료하면 게시물에 반영돼요. 공개 범위를 선택해 주세요.'
        : '완료하면 게시물로 올라가요. 공개 범위를 선택해 주세요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: isRepublish ? '비공개로 완료' : '비공개로 게시',
          onPress: () => {
            void (async () => {
              if (dirtyRef.current && !(await persistCurrent())) {
                Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
                return;
              }
              if (await completeDiary(diaryId, 'private')) {
                navigation.replace('DiaryEdit', {
                  diaryId,
                  mode: 'view',
                  republish: false,
                });
              }
            })();
          },
        },
        {
          text: isRepublish ? '공개로 완료' : '공개로 게시',
          onPress: () => {
            void (async () => {
              if (dirtyRef.current && !(await persistCurrent())) {
                Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
                return;
              }
              if (await completeDiary(diaryId, 'public')) {
                navigation.replace('DiaryEdit', {
                  diaryId,
                  mode: 'view',
                  republish: false,
                });
              }
            })();
          },
        },
      ],
    );
  };

  const handleEditCover = () => {
    if (readOnly) {
      return;
    }
    void (async () => {
      if (dirtyRef.current && !(await persistCurrent())) {
        Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
        return;
      }
      navigation.navigate('DiaryCoverEdit', { diaryId });
    })();
  };

  const handleBack = () => {
    if (readOnly || !dirtyRef.current) {
      navigation.goBack();
      return;
    }
    Alert.alert('꾸미기', '저장하고 나갈까요?', [
      { text: '취소', style: 'cancel' },
      { text: '저장 안 함', style: 'destructive', onPress: () => navigation.goBack() },
      {
        text: '저장',
        onPress: () => {
          void (async () => {
            if (await persistCurrent()) {
              navigation.goBack();
            } else {
              Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
            }
          })();
        },
      },
    ]);
  };

  const placeContentId = activePlace?.placeContentId?.trim() || null;
  const placeSaved = placeContentId ? savedPlaceIds.includes(placeContentId) : false;

  const handleToggleLike = useCallback(async () => {
    if (likeBusy) return;
    const tokens = await loadTokens();
    if (!tokens?.access) {
      Alert.alert('좋아요', '로그인이 필요합니다.');
      return;
    }
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    setLikeBusy(true);
    try {
      const result = await toggleTripLike(tokens.access, diaryId);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (error) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      const message =
        error instanceof ApiError ? error.message : '좋아요를 반영하지 못했어요.';
      Alert.alert('좋아요', message);
    } finally {
      setLikeBusy(false);
    }
  }, [diaryId, likeBusy, likeCount, liked]);

  const handleTogglePlaceSave = useCallback(async () => {
    if (!placeContentId || placeSaveBusy) return;
    const tokens = await loadTokens();
    if (!tokens?.access) {
      Alert.alert('찜하기', '로그인이 필요합니다.');
      return;
    }
    const wasSaved = savedPlaceIds.includes(placeContentId);
    setSavedPlaceIds((prev) =>
      wasSaved ? prev.filter((id) => id !== placeContentId) : [...prev, placeContentId],
    );
    setPlaceSaveBusy(true);
    try {
      if (wasSaved) {
        await unsavePlace(tokens.access, placeContentId);
      } else {
        const result = await savePlace(tokens.access, { contentId: placeContentId });
        if (!result.saved) {
          setSavedPlaceIds((prev) => prev.filter((id) => id !== placeContentId));
        }
      }
    } catch (error) {
      setSavedPlaceIds((prev) =>
        wasSaved
          ? prev.includes(placeContentId)
            ? prev
            : [...prev, placeContentId]
          : prev.filter((id) => id !== placeContentId),
      );
      const message =
        error instanceof ApiError
          ? error.message
          : wasSaved
            ? '찜을 해제하지 못했어요.'
            : '찜하지 못했어요.';
      Alert.alert(wasSaved ? '찜 해제 실패' : '찜하기 실패', message);
    } finally {
      setPlaceSaveBusy(false);
    }
  }, [placeContentId, placeSaveBusy, savedPlaceIds]);

  if (!diary) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>다이어리를 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showTrash = draggingLayer && sheet === 'none';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton onPress={handleBack} />
        <Text style={styles.screenTitle}>{readOnly ? '다이어리' : '다이어리 꾸미기'}</Text>
        {!readOnly ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="표지 꾸미기"
            onPress={handleEditCover}
            style={({ pressed }) => [styles.coverChip, pressed && styles.pressed]}
          >
            <Ionicons name="book-outline" size={14} color={colors.ink} />
            <Text style={styles.coverChipText}>표지</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        {!readOnly ? (
          <Pressable onPress={handleDone} style={({ pressed }) => [styles.doneChip, pressed && styles.pressed]}>
            <Text style={styles.doneChipText}>{isRepublish ? '완료' : '게시'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={[styles.bookStack, readOnly && styles.bookStackWithSocial]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.indexTabs}
            style={styles.indexScroll}
          >
            {readOnly ? (
              <Pressable
                onPress={() => setViewingCover(true)}
                style={[styles.indexTab, viewingCover && styles.indexTabActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: viewingCover }}
                accessibilityLabel="표지"
              >
                <Text style={[styles.indexTabText, viewingCover && styles.indexTabTextActive]}>
                  표지
                </Text>
              </Pressable>
            ) : null}
            {timeline.map((group) => {
              const selected = !viewingCover && group.dateKey === activeDay?.dateKey;
              return (
                <Pressable
                  key={group.dateKey}
                  onPress={() => {
                    setViewingCover(false);
                    void selectDay(group.dateKey);
                  }}
                  style={[styles.indexTab, selected && styles.indexTabActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${group.dayNumber}일차`}
                >
                  <Text style={[styles.indexTabText, selected && styles.indexTabTextActive]}>
                    {group.dayNumber}일차
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <HomeBookShell
            style={styles.bookShell}
            contentStyle={styles.bookContent}
            coverColor={coverColor}
            spineWidth={18}
            spineOffsetX={-8}
            hideSpineRidges
            hidePageEdge
          >
            <View style={styles.pageWrap} pointerEvents={readOnly ? 'box-none' : 'auto'}>
              <View style={styles.pageCanvasHost} pointerEvents={readOnly ? 'none' : 'auto'}>
              {readOnly && viewingCover ? (
                <CoverCanvas
                  style={styles.pageCanvas}
                  fill
                  editable={false}
                  backgroundColor={getCoverBackgroundColor(viewCover)}
                  title={viewCover.title?.trim() || diary.name}
                  fontId={viewCover.fontId}
                  titleX={viewCover.titleX}
                  titleY={viewCover.titleY}
                  titleScale={viewCover.titleScale}
                  titleRotation={viewCover.titleRotation}
                  titleColor={resolveCoverTitleColor(
                    viewCover,
                    getCoverBackgroundColor(viewCover),
                  )}
                  photos={viewCover.photos ?? []}
                  photoById={photoById}
                  stickers={viewCover.stickers ?? []}
                  texts={viewCover.texts ?? []}
                  selectedPhotoId={null}
                  selectedStickerId={null}
                  selectedTextId={null}
                />
              ) : (
              <DiaryPageCanvas
                style={styles.pageCanvas}
                photos={photos}
                photoById={photoById}
                stickers={stickers}
                texts={texts}
                selectedPhotoId={readOnly ? null : selectedPhotoId}
                selectedStickerId={readOnly ? null : selectedStickerId}
                selectedTextId={readOnly ? null : selectedTextId}
                onBackgroundPress={readOnly ? undefined : clearSelection}
                onSelectPhoto={
                  readOnly
                    ? undefined
                    : (id) => {
                        setSelectedPhotoId(id);
                        setSelectedStickerId(null);
                        setSelectedTextId(null);
                      }
                }
                onSelectSticker={
                  readOnly
                    ? undefined
                    : (id) => {
                        setSelectedStickerId(id);
                        setSelectedPhotoId(null);
                        setSelectedTextId(null);
                      }
                }
                onSelectText={
                  readOnly
                    ? undefined
                    : (id) => {
                        setSelectedTextId(id);
                        setSelectedPhotoId(null);
                        setSelectedStickerId(null);
                      }
                }
                onEditText={readOnly ? undefined : openEditText}
                onMovePhoto={
                  readOnly
                    ? undefined
                    : (id, x, y) => {
                        setPhotos((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
                        markDirty();
                      }
                }
                onScalePhoto={
                  readOnly
                    ? undefined
                    : (id, scale) => {
                        setPhotos((prev) =>
                          prev.map((item) => (item.id === id ? { ...item, scale } : item)),
                        );
                        markDirty();
                      }
                }
                onRotatePhoto={
                  readOnly
                    ? undefined
                    : (id, rotation) => {
                        setPhotos((prev) =>
                          prev.map((item) => (item.id === id ? { ...item, rotation } : item)),
                        );
                        markDirty();
                      }
                }
                onMoveSticker={
                  readOnly
                    ? undefined
                    : (id, x, y) => {
                        setStickers((prev) =>
                          prev.map((item) => (item.id === id ? { ...item, x, y } : item)),
                        );
                        markDirty();
                      }
                }
                onScaleSticker={
                  readOnly
                    ? undefined
                    : (id, scale) => {
                        setStickers((prev) =>
                          prev.map((item) => (item.id === id ? { ...item, scale } : item)),
                        );
                        markDirty();
                      }
                }
                onRotateSticker={
                  readOnly
                    ? undefined
                    : (id, rotation) => {
                        setStickers((prev) =>
                          prev.map((item) => (item.id === id ? { ...item, rotation } : item)),
                        );
                        markDirty();
                      }
                }
                onMoveText={
                  readOnly
                    ? undefined
                    : (id, x, y) => {
                        setTexts((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
                        markDirty();
                      }
                }
                onScaleText={
                  readOnly
                    ? undefined
                    : (id, scale) => {
                        setTexts((prev) =>
                          prev.map((item) => (item.id === id ? { ...item, scale } : item)),
                        );
                        markDirty();
                      }
                }
                onRotateText={
                  readOnly
                    ? undefined
                    : (id, rotation) => {
                        setTexts((prev) =>
                          prev.map((item) => (item.id === id ? { ...item, rotation } : item)),
                        );
                        markDirty();
                      }
                }
                onLayerDragChange={
                  readOnly
                    ? undefined
                    : (dragging) => {
                        setDraggingLayer(dragging);
                        if (dragging) {
                          requestAnimationFrame(() => {
                            measureDeleteChip();
                            requestAnimationFrame(measureDeleteChip);
                          });
                        }
                      }
                }
                onLayerDragPointer={
                  readOnly
                    ? undefined
                    : (pageX, pageY) => {
                        if (deleteHitRef.current.width <= 0) {
                          measureDeleteChip();
                        }
                        setTrashHotState(shouldDeleteAtPoint(pageX, pageY));
                      }
                }
                onPhotoDragEnd={
                  readOnly
                    ? undefined
                    : (id, pageX, pageY) => handleDragEnd('photo', id, pageX, pageY)
                }
                onStickerDragEnd={
                  readOnly
                    ? undefined
                    : (id, pageX, pageY) => handleDragEnd('sticker', id, pageX, pageY)
                }
                onTextDragEnd={
                  readOnly
                    ? undefined
                    : (id, pageX, pageY) => handleDragEnd('text', id, pageX, pageY)
                }
              />
              )}
              </View>

              {showTrash ? (
                <View
                  ref={deleteChipRef}
                  collapsable={false}
                  onLayout={measureDeleteChip}
                  style={[styles.trashChip, trashHot && styles.trashChipHot]}
                  pointerEvents="none"
                >
                  <Ionicons name="trash-outline" size={trashHot ? 22 : 18} color={colors.white} />
                </View>
              ) : null}

              {!(readOnly && viewingCover) ? (
              <View style={styles.timeline}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="일자별 경로 지도"
                  onPress={() =>
                    navigation.navigate('DiaryDailyCourseMap', {
                      diaryId,
                      dayNumber: activeDay?.dayNumber,
                    })
                  }
                  style={({ pressed }) => [styles.mapFab, pressed && styles.pressed]}
                  hitSlop={8}
                >
                  <Ionicons name="map-outline" size={16} color={colors.ink} />
                </Pressable>
                <View style={styles.timelineLine} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.markersRow}
                >
                  {dayPlaces.map((place) => {
                    const selected = place.id === activePlace?.id;
                    return (
                      <Pressable
                        key={place.id}
                        onPress={() => void selectPlace(place.id)}
                        style={({ pressed }) => [
                          styles.markerBtn,
                          selected && styles.markerSelected,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={place.placeName}
                      >
                        <View style={[styles.markerDot, selected && styles.markerDotActive]} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              ) : null}
            </View>
          </HomeBookShell>
        </View>
      </View>

      {!readOnly ? (
      <>
      <View style={[styles.toolDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.toolRow}>
          <Pressable
            onPress={() => {
              void pickPhotoFromLibrary();
            }}
            style={({ pressed }) => [styles.toolItem, pressed && styles.pressed]}
          >
            <Ionicons name="image-outline" size={24} color={colors.ink} />
            <Text style={styles.toolLabel}>사진</Text>
          </Pressable>
          <Pressable
            disabled={!selectedPhotoLayer}
            onPress={() => setCropOpen(true)}
            style={({ pressed }) => [styles.toolItem, pressed && styles.pressed]}
          >
            <Ionicons
              name="crop-outline"
              size={24}
              color={selectedPhotoLayer ? colors.ink : colors.inkMuted}
            />
            <Text style={[styles.toolLabel, !selectedPhotoLayer && styles.toolLabelDisabled]}>
              자르기
            </Text>
          </Pressable>
          <Pressable
            onPress={openTextTool}
            style={({ pressed }) => [styles.toolItem, pressed && styles.pressed]}
          >
            <Text style={styles.toolAa}>Aa</Text>
            <Text style={styles.toolLabel}>텍스트</Text>
          </Pressable>
          <Pressable
            onPress={() => setSheet('sticker')}
            style={({ pressed }) => [styles.toolItem, pressed && styles.pressed]}
          >
            <Ionicons name="happy-outline" size={24} color={colors.ink} />
            <Text style={styles.toolLabel}>스티커</Text>
          </Pressable>
        </View>
      </View>

      {selectedPhotoLayer ? (
        <PhotoCropModal
          visible={cropOpen}
          uri={photoById[selectedPhotoLayer.photoId]?.uri ?? ''}
          initialCrop={selectedPhotoLayer.cropRect}
          onCancel={() => setCropOpen(false)}
          onConfirm={(next) => {
            setPhotos((prev) =>
              prev.map((item) =>
                item.id === selectedPhotoLayer.id ? { ...item, cropRect: next } : item,
              ),
            );
            setCropOpen(false);
            markDirty();
          }}
        />
      ) : null}

      <Modal visible={sheet === 'sticker'} transparent animationType="slide" onRequestClose={() => setSheet('none')}>
        <Pressable style={styles.sheetBackdropClear} onPress={() => setSheet('none')} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>스티커</Text>
          <ScrollView contentContainerStyle={styles.stickerGrid}>
            {DECOR_STICKER_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => addSticker(emoji)}
                style={({ pressed }) => [styles.stickerCell, pressed && styles.pressed]}
              >
                <Text style={styles.stickerCellText}>{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={sheet === 'text'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSheet('none');
          setEditingTextId(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.textModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.textModalDim} onPress={commitTextDraft} />
          <View style={styles.textComposer}>
            <View style={styles.textField}>
              <Text
                pointerEvents="none"
                style={[
                  styles.textInput,
                  styles.textPreview,
                  getFontInputStyle(draftFontId),
                  { color: draftColor },
                ]}
              >
                {draftText}
              </Text>
              <TextInput
                value={draftText}
                onChangeText={setDraftText}
                style={[styles.textInput, styles.textInputHit, { color: 'transparent' }]}
                selectionColor={draftColor}
                cursorColor={draftColor}
                multiline
                autoFocus
                maxLength={80}
              />
            </View>
          </View>
          <SafeAreaView edges={['bottom']} style={styles.fontBarWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorBar}>
              {DECOR_TEXT_COLORS.map((swatch) => (
                <Pressable key={swatch} onPress={() => setDraftColor(swatch)} style={styles.colorDotHit}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: swatch },
                      swatch === '#FFFFFF' && styles.colorDotLight,
                      swatch === draftColor && styles.colorDotActive,
                    ]}
                  />
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontBar}>
              {DECOR_FONTS.map((font) => {
                const active = font.id === draftFontId;
                return (
                  <Pressable
                    key={font.id}
                    onPress={() => setDraftFontId(font.id)}
                    style={[styles.fontChip, active && styles.fontChipActive]}
                  >
                    <Text style={[styles.fontChipText, font.style, active && styles.fontChipTextActive]}>
                      {font.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
      </>
      ) : (
        <>
          <DiarySocialDock
            liked={liked}
            likeCount={likeCount}
            commentCount={commentCount}
            likeBusy={likeBusy}
            placeName={activePlace?.placeName}
            placeSaved={placeSaved}
            placeSaveEnabled={Boolean(placeContentId)}
            placeSaveBusy={placeSaveBusy}
            onToggleLike={() => {
              void handleToggleLike();
            }}
            onOpenComments={() => setCommentsOpen(true)}
            onTogglePlaceSave={() => {
              void handleTogglePlaceSave();
            }}
            bottomInset={insets.bottom}
          />
          <DiaryCommentsSheet
            visible={commentsOpen}
            tripId={diaryId}
            onClose={() => setCommentsOpen(false)}
            onCommentAdded={() => setCommentCount((prev) => prev + 1)}
            onCommentDeleted={() => setCommentCount((prev) => Math.max(0, prev - 1))}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  screenTitle: {
    flex: 1,
    ...typography.brandTitle,
    fontSize: 18,
    color: colors.ink,
  },
  headerSpacer: {
    width: 64,
  },
  coverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  coverChipText: { ...typography.label, fontSize: 12, color: colors.ink },
  doneChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneChipText: { ...typography.label, color: colors.white },
  body: {
    flex: 1,
    paddingTop: spacing.xs,
    overflow: 'visible',
  },
  bookStack: {
    flex: 1,
    paddingTop: 32,
    overflow: 'visible',
  },
  bookStackWithSocial: {
    marginBottom: spacing.lg,
  },
  indexScroll: {
    position: 'absolute',
    top: 0,
    left: spacing.xl + 22,
    right: spacing.xl + 18,
    height: 32,
    zIndex: 20,
    elevation: 20,
  },
  indexTabs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
    gap: 5,
    paddingHorizontal: 2,
  },
  indexTab: {
    minWidth: 50,
    height: 28,
    paddingHorizontal: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexTabActive: {
    backgroundColor: '#A63030',
    borderColor: '#A63030',
    height: 30,
  },
  indexTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A3A3A3',
    textAlign: 'center',
  },
  indexTabTextActive: { color: '#FFFFFF' },
  bookShell: {
    flex: 1,
    borderRadius: 0,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
  },
  bookContent: {
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 4,
    paddingRight: 8,
  },
  pageWrap: {
    flex: 1,
    position: 'relative',
  },
  pageCanvas: {
    marginRight: 0,
    borderRadius: 0,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
  },
  pageCanvasHost: {
    flex: 1,
  },
  trashChip: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 48,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  trashChipHot: {
    backgroundColor: 'rgba(214,69,69,0.9)',
    transform: [{ scale: 1.08 }],
  },
  timeline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    justifyContent: 'center',
    zIndex: 5,
  },
  mapFab: {
    position: 'absolute',
    right: 6,
    top: -2,
    zIndex: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  timelineLine: {
    position: 'absolute',
    left: 8,
    right: 40,
    top: '50%',
    marginTop: -1,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  markersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 8,
    paddingRight: 40,
  },
  markerBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  markerSelected: { opacity: 1 },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8A8A8A',
    borderWidth: 2,
    borderColor: '#5A5A5A',
  },
  markerDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.black,
    borderColor: colors.white,
  },
  toolDock: {
    marginTop: 25,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  toolRow: { flexDirection: 'row', justifyContent: 'space-around' },
  toolItem: { alignItems: 'center', gap: 4, minWidth: 64, paddingVertical: spacing.sm },
  toolAa: { fontSize: 20, fontWeight: '700', color: colors.ink, lineHeight: 24 },
  toolLabel: { fontSize: 11, color: colors.inkSoft },
  toolLabelDisabled: { color: colors.inkMuted },
  sheetBackdropClear: { flex: 1, backgroundColor: 'transparent' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '55%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D4',
    marginBottom: spacing.md,
  },
  sheetTitle: { ...typography.label, color: colors.ink, marginBottom: spacing.md },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  stickerCell: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerCellText: { fontSize: 28 },
  textModalRoot: { flex: 1 },
  textModalDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  textComposer: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  textField: { minHeight: 120 },
  textInput: { fontSize: 28, fontWeight: '600', textAlign: 'center' },
  textPreview: { ...StyleSheet.absoluteFillObject },
  textInputHit: { minHeight: 120 },
  fontBarWrap: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  colorBar: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  colorDotHit: { padding: 4 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotLight: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#D4D4D4' },
  colorDotActive: { borderWidth: 2, borderColor: colors.white },
  fontBar: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  fontChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fontChipActive: { backgroundColor: colors.white },
  fontChipText: { color: colors.white, fontSize: 13 },
  fontChipTextActive: { color: colors.ink },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.inkMuted },
  pressed: { opacity: 0.85 },
});
