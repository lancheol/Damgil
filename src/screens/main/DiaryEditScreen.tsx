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
import { DiaryPageCanvas } from '../../components/diary/DiaryPageCanvas';
import { PhotoCropModal } from '../../components/diary/PhotoCropModal';
import { HomeBookShell } from '../../components/home/HomeBookShell';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import {
  DecorFontId,
  DecorPhotoLayer,
  DecorSticker,
  DecorTextLayer,
  DiaryPhoto,
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
import {
  buildPlaceSelections,
  isPlacesSetupComplete,
} from '../../utils/diaryPlaces';
import { createTextLayer } from '../../utils/diaryTextLayers';
import { buildDiaryTimeline } from '../../utils/diaryTimeline';
import { getCoverBackgroundColor, getEffectiveCover } from '../../utils/diaryCover';
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
  const { getDiaryById, savePlaceSelections, savePlacePageDecoration, addPhotoToDiary } =
    useDiaries();
  const diary = getDiaryById(diaryId);

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
  const photoById = useMemo(() => {
    const map: Record<string, DiaryPhoto | undefined> = {};
    for (const photo of diary?.photos ?? []) {
      map[photo.id] = photo;
    }
    return map;
  }, [diary]);

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
    return (diary.placeSelections ?? []).filter(
      (place) =>
        dayPhotoIds.has(place.representativePhotoId) ||
        place.photoIds.some((id) => dayPhotoIds.has(id)),
    );
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
  const [draftColor, setDraftColor] = useState(DEFAULT_DECOR_TEXT_COLOR);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const trashHotRef = useRef(false);
  const deleteHitRef = useRef<HitRect>({ x: 0, y: 0, width: 0, height: 0 });
  const deleteChipRef = useRef<View>(null);
  const loadedPlaceIdRef = useRef<string | null>(null);
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

  const persistCurrent = useCallback(() => {
    const place = activePlaceRef.current;
    if (!place) {
      return true;
    }
    const ok = savePlacePageDecoration({
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
  }, [diaryId, savePlacePageDecoration]);

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
        persistCurrent();
      }
      setActivePlaceId(null);
      return;
    }
    if (!dayPlaces.some((place) => place.id === activePlaceId)) {
      if (dirtyRef.current) {
        persistCurrent();
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
      return;
    }
    if (loadedPlaceIdRef.current === activePlace.id) {
      return;
    }
    const saved =
      diary?.placeSelections?.find((place) => place.id === activePlace.id)?.pageDecoration ??
      activePlace.pageDecoration;
    const next = normalizePlacePageDecoration(saved, activePlace.representativePhotoId);
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
  }, [activePlace, diary?.placeSelections]);

  const selectPlace = (placeId: string) => {
    if (placeId === activePlaceId) {
      return;
    }
    if (dirtyRef.current) {
      const ok = persistCurrent();
      if (!ok) {
        Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
        return;
      }
    }
    loadedPlaceIdRef.current = null;
    setActivePlaceId(placeId);
  };

  const selectDay = (dateKey: string) => {
    if (dateKey === activeDayKey) {
      return;
    }
    if (dirtyRef.current) {
      const ok = persistCurrent();
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
    const saved = addPhotoToDiary({
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
    if (shouldDelete) {
      if (type === 'photo') {
        setPhotos((prev) => prev.filter((item) => item.id !== id));
        setSelectedPhotoId(null);
      } else if (type === 'sticker') {
        setStickers((prev) => prev.filter((item) => item.id !== id));
        setSelectedStickerId(null);
      } else {
        setTexts((prev) => prev.filter((item) => item.id !== id));
        setSelectedTextId(null);
      }
      markDirty();
    }
    setTrashHotState(false);
    setDraggingLayer(false);
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
    if (dirtyRef.current && !persistCurrent()) {
      Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
      return;
    }
    navigation.goBack();
  };

  const handleBack = () => {
    if (!dirtyRef.current) {
      navigation.goBack();
      return;
    }
    Alert.alert('꾸미기', '저장하고 나갈까요?', [
      { text: '취소', style: 'cancel' },
      { text: '저장 안 함', style: 'destructive', onPress: () => navigation.goBack() },
      {
        text: '저장',
        onPress: () => {
          if (persistCurrent()) {
            navigation.goBack();
          } else {
            Alert.alert('저장 실패', '페이지를 저장하지 못했어요.');
          }
        },
      },
    ]);
  };

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
        <Text style={styles.screenTitle}>다이어리 꾸미기</Text>
        <Pressable onPress={handleDone} style={({ pressed }) => [styles.doneChip, pressed && styles.pressed]}>
          <Text style={styles.doneChipText}>완료</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.bookStack}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.indexTabs}
            style={styles.indexScroll}
          >
            {timeline.map((group) => {
              const selected = group.dateKey === activeDay?.dateKey;
              return (
                <Pressable
                  key={group.dateKey}
                  onPress={() => selectDay(group.dateKey)}
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
            <View style={styles.pageWrap}>
              <DiaryPageCanvas
                style={styles.pageCanvas}
                photos={photos}
                photoById={photoById}
                stickers={stickers}
                texts={texts}
                selectedPhotoId={selectedPhotoId}
                selectedStickerId={selectedStickerId}
                selectedTextId={selectedTextId}
                onBackgroundPress={clearSelection}
                onSelectPhoto={(id) => {
                  setSelectedPhotoId(id);
                  setSelectedStickerId(null);
                  setSelectedTextId(null);
                }}
                onSelectSticker={(id) => {
                  setSelectedStickerId(id);
                  setSelectedPhotoId(null);
                  setSelectedTextId(null);
                }}
                onSelectText={(id) => {
                  setSelectedTextId(id);
                  setSelectedPhotoId(null);
                  setSelectedStickerId(null);
                }}
                onEditText={openEditText}
                onMovePhoto={(id, x, y) => {
                  setPhotos((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
                  markDirty();
                }}
                onScalePhoto={(id, scale) => {
                  setPhotos((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, scale } : item)),
                  );
                  markDirty();
                }}
                onRotatePhoto={(id, rotation) => {
                  setPhotos((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, rotation } : item)),
                  );
                  markDirty();
                }}
                onMoveSticker={(id, x, y) => {
                  setStickers((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, x, y } : item)),
                  );
                  markDirty();
                }}
                onScaleSticker={(id, scale) => {
                  setStickers((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, scale } : item)),
                  );
                  markDirty();
                }}
                onRotateSticker={(id, rotation) => {
                  setStickers((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, rotation } : item)),
                  );
                  markDirty();
                }}
                onMoveText={(id, x, y) => {
                  setTexts((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
                  markDirty();
                }}
                onScaleText={(id, scale) => {
                  setTexts((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, scale } : item)),
                  );
                  markDirty();
                }}
                onRotateText={(id, rotation) => {
                  setTexts((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, rotation } : item)),
                  );
                  markDirty();
                }}
                onLayerDragChange={(dragging) => {
                  setDraggingLayer(dragging);
                  if (dragging) {
                    requestAnimationFrame(() => {
                      measureDeleteChip();
                      requestAnimationFrame(measureDeleteChip);
                    });
                  }
                }}
                onLayerDragPointer={(pageX, pageY) => {
                  if (deleteHitRef.current.width <= 0) {
                    measureDeleteChip();
                  }
                  setTrashHotState(shouldDeleteAtPoint(pageX, pageY));
                }}
                onPhotoDragEnd={(id, pageX, pageY) => handleDragEnd('photo', id, pageX, pageY)}
                onStickerDragEnd={(id, pageX, pageY) => handleDragEnd('sticker', id, pageX, pageY)}
                onTextDragEnd={(id, pageX, pageY) => handleDragEnd('text', id, pageX, pageY)}
              />

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

              <View style={styles.timeline}>
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
                        onPress={() => selectPlace(place.id)}
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
            </View>
          </HomeBookShell>
        </View>
      </View>

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
    ...typography.brandTitle,
    flex: 1,
    fontSize: 18,
    color: colors.ink,
  },
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
  timelineLine: {
    position: 'absolute',
    left: 8,
    right: 8,
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
