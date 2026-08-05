import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordDecorCanvas } from '../../components/diary/RecordDecorCanvas';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { DecorFontId, DecorSticker, DecorTextLayer, PhotoDecoration } from '../../types/diary';
import {
  createStickerId,
  DECOR_FONTS,
  DECOR_STICKER_EMOJIS,
  DECOR_TEXT_COLORS,
  DEFAULT_DECOR_TEXT_COLOR,
} from '../../utils/decorAssets';
import {
  buildPhotoDecoration,
  createTextLayer,
  resolveDecorationTexts,
} from '../../utils/diaryTextLayers';
import {
  formatRecordTime,
  getDayNumberForPhoto,
  getPlaceLabel,
  buildDiaryTimeline,
} from '../../utils/diaryTimeline';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryRecordDecorate'>;
type ToolSheet = 'none' | 'sticker' | 'text' | 'more';

type HitRect = { x: number; y: number; width: number; height: number };

function emptyDecoration(note = ''): PhotoDecoration {
  return buildPhotoDecoration({
    stickers: [],
    texts: note.trim()
      ? [createTextLayer(note.trim(), 'sans', { x: 0.5, y: 0.72 })]
      : [],
  });
}

export function DiaryRecordDecorateScreen({ navigation, route }: Props) {
  const { diaryId, photoId } = route.params;
  const insets = useSafeAreaInsets();
  const { getDiaryById, savePhotoDecoration, removePhotosFromDiary } = useDiaries();
  const diary = getDiaryById(diaryId);

  const orderedIds = useMemo(() => {
    if (!diary) {
      return [] as string[];
    }
    return buildDiaryTimeline(diary).flatMap((group) => group.records.map((item) => item.id));
  }, [diary]);

  const currentIndex = orderedIds.indexOf(photoId);
  const photo = diary?.photos?.find((item) => item.id === photoId);

  const initial = photo?.decoration ?? emptyDecoration(photo?.note ?? '');
  const initialTexts = resolveDecorationTexts(initial);

  const [stickers, setStickers] = useState<DecorSticker[]>(initial.stickers);
  const [texts, setTexts] = useState<DecorTextLayer[]>(initialTexts);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [draggingLayer, setDraggingLayer] = useState(false);
  const [trashHot, setTrashHot] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sheet, setSheet] = useState<ToolSheet>('none');
  const trashHotRef = useRef(false);
  const deleteHitRef = useRef<HitRect>({ x: 0, y: 0, width: 0, height: 0 });
  const deleteChipRef = useRef<View>(null);

  const [draftText, setDraftText] = useState('');
  const [draftFontId, setDraftFontId] = useState<DecorFontId>('sans');
  const [draftColor, setDraftColor] = useState<string>(DEFAULT_DECOR_TEXT_COLOR);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) {
      return;
    }
    const next = photo.decoration ?? emptyDecoration(photo.note ?? '');
    setStickers(next.stickers);
    setTexts(resolveDecorationTexts(next));
    setSelectedStickerId(null);
    setSelectedTextId(null);
    setDraggingLayer(false);
    setTrashHot(false);
    trashHotRef.current = false;
    setDirty(false);
    setSheet('none');
    setEditingTextId(null);
  }, [photoId, photo?.decoration?.updatedAt, photo?.id]);

  const markDirty = useCallback(() => setDirty(true), []);

  const measureDeleteChip = useCallback(() => {
    const node = deleteChipRef.current;
    if (!node) {
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        deleteHitRef.current = { x, y, width, height };
      }
    });
  }, []);

  const setTrashHotState = useCallback((hot: boolean) => {
    trashHotRef.current = hot;
    setTrashHot(hot);
  }, []);

  const isOverDeleteChip = useCallback((pageX: number, pageY: number) => {
    const pad = 28;
    const hit = deleteHitRef.current;
    if (hit.width <= 0 || hit.height <= 0) {
      return false;
    }
    return (
      pageX >= hit.x - pad &&
      pageX <= hit.x + hit.width + pad &&
      pageY >= hit.y - pad &&
      pageY <= hit.y + hit.height + pad
    );
  }, []);

  const updateTrashHotFromPointer = useCallback(
    (pageX: number, pageY: number) => {
      if (deleteHitRef.current.width <= 0) {
        measureDeleteChip();
      }
      setTrashHotState(isOverDeleteChip(pageX, pageY));
    },
    [isOverDeleteChip, measureDeleteChip, setTrashHotState],
  );

  const shouldDeleteAtPoint = useCallback(
    (pageX?: number, pageY?: number) => {
      if (typeof pageX === 'number' && typeof pageY === 'number') {
        return isOverDeleteChip(pageX, pageY);
      }
      return trashHotRef.current;
    },
    [isOverDeleteChip],
  );

  const persist = useCallback(() => {
    if (!diary || !photo) {
      return false;
    }
    return savePhotoDecoration({
      diaryId,
      photoId: photo.id,
      decoration: buildPhotoDecoration({ stickers, texts }),
    });
  }, [diary, photo, diaryId, stickers, texts, savePhotoDecoration]);

  const goToPhoto = (nextId: string, transition: 'prev' | 'next') => {
    if (dirty) {
      const ok = persist();
      if (!ok) {
        Alert.alert('저장 실패', '편집 내용을 저장하지 못했습니다.');
        return;
      }
      setDirty(false);
    }
    navigation.replace('DiaryRecordDecorate', {
      diaryId,
      photoId: nextId,
      transition,
    });
  };

  const handleSave = () => {
    const ok = persist();
    if (!ok) {
      Alert.alert('저장 실패', '편집 내용을 저장하지 못했습니다.');
      return;
    }
    setDirty(false);
    navigation.goBack();
  };

  const handleBack = () => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert('편집 내용', '저장하고 나갈까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '저장 안 함',
        style: 'destructive',
        onPress: () => navigation.goBack(),
      },
      {
        text: '저장',
        onPress: () => {
          if (persist()) {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleDeleteRecord = () => {
    if (!photo) {
      return;
    }
    setSheet('none');
    Alert.alert(
      '기록 삭제',
      '이 장소 기록을 삭제할까요? 원본 미디어와 꾸미기 레이어가 함께 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const ok = removePhotosFromDiary(diaryId, [photo.id]);
            if (!ok) {
              Alert.alert('삭제 실패', '기록을 삭제하지 못했습니다.');
              return;
            }
            navigation.goBack();
          },
        },
      ],
    );
  };

  const clearSelection = () => {
    setSelectedStickerId(null);
    setSelectedTextId(null);
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
        y: 0.42,
        color: draftColor,
      });
      setTexts((prev) => [...prev, layer]);
      setSelectedTextId(layer.id);
    }
    setSelectedStickerId(null);
    setEditingTextId(null);
    setSheet('none');
    markDirty();
  };

  const openStickerTool = () => {
    setSelectedTextId(null);
    setSheet('sticker');
  };

  const addSticker = (emoji: string) => {
    const sticker: DecorSticker = {
      id: createStickerId('record'),
      emoji,
      x: 0.5,
      y: 0.42,
      scale: 1,
      rotation: 0,
    };
    setStickers((prev) => [...prev, sticker]);
    setSelectedStickerId(sticker.id);
    setSelectedTextId(null);
    setSheet('none');
    markDirty();
  };

  if (!diary || !photo) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>기록을 찾을 수 없어요.</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>닫기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const dayNumber = getDayNumberForPhoto(diary, photo);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < orderedIds.length - 1;
  const showChrome = !draggingLayer && sheet === 'none';
  const showDeleteTarget = draggingLayer && sheet === 'none';

  return (
    <View style={styles.root}>
      <RecordDecorCanvas
        uri={photo.uri}
        mediaType={photo.mediaType}
        stickers={stickers}
        texts={texts}
        selectedStickerId={selectedStickerId}
        selectedTextId={selectedTextId}
        fullBleed
        onBackgroundPress={clearSelection}
        onSelectSticker={(id) => {
          setSelectedStickerId(id);
          setSelectedTextId(null);
          setSheet('none');
        }}
        onSelectText={(id) => {
          setSelectedTextId(id);
          setSelectedStickerId(null);
          setSheet('none');
        }}
        onEditText={openEditText}
        onLayerDragChange={(dragging) => {
          setDraggingLayer(dragging);
          if (dragging) {
            requestAnimationFrame(() => {
              measureDeleteChip();
              requestAnimationFrame(measureDeleteChip);
            });
          }
        }}
        onLayerDragPointer={updateTrashHotFromPointer}
        onMoveSticker={(id, x, y) => {
          setStickers((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
          markDirty();
        }}
        onScaleSticker={(id, scale) => {
          setStickers((prev) => prev.map((item) => (item.id === id ? { ...item, scale } : item)));
          markDirty();
        }}
        onRotateSticker={(id, rotation) => {
          setStickers((prev) => prev.map((item) => (item.id === id ? { ...item, rotation } : item)));
          markDirty();
        }}
        onMoveText={(id, x, y) => {
          setTexts((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
          markDirty();
        }}
        onScaleText={(id, scale) => {
          setTexts((prev) => prev.map((item) => (item.id === id ? { ...item, scale } : item)));
          markDirty();
        }}
        onRotateText={(id, rotation) => {
          setTexts((prev) => prev.map((item) => (item.id === id ? { ...item, rotation } : item)));
          markDirty();
        }}
        onStickerDragEnd={(id, pageX, pageY) => {
          const finish = (shouldDelete: boolean) => {
            if (shouldDelete) {
              setStickers((prev) => prev.filter((item) => item.id !== id));
              setSelectedStickerId(null);
              markDirty();
            }
            setTrashHotState(false);
            setDraggingLayer(false);
          };

          if (typeof pageX !== 'number' || typeof pageY !== 'number') {
            finish(trashHotRef.current);
            return;
          }

          const node = deleteChipRef.current;
          if (!node) {
            finish(shouldDeleteAtPoint(pageX, pageY));
            return;
          }

          node.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
              deleteHitRef.current = { x, y, width, height };
            }
            finish(shouldDeleteAtPoint(pageX, pageY));
          });
        }}
        onTextDragEnd={(id, pageX, pageY) => {
          const finish = (shouldDelete: boolean) => {
            if (shouldDelete) {
              setTexts((prev) => prev.filter((item) => item.id !== id));
              setSelectedTextId(null);
              markDirty();
            }
            setTrashHotState(false);
            setDraggingLayer(false);
          };

          if (typeof pageX !== 'number' || typeof pageY !== 'number') {
            finish(trashHotRef.current);
            return;
          }

          const node = deleteChipRef.current;
          if (!node) {
            finish(shouldDeleteAtPoint(pageX, pageY));
            return;
          }

          node.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
              deleteHitRef.current = { x, y, width, height };
            }
            finish(shouldDeleteAtPoint(pageX, pageY));
          });
        }}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.topSafe} edges={['top']}>
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={handleBack}
            style={({ pressed }) => [styles.iconCircle, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>

          {showChrome ? (
            <View style={styles.topMeta} pointerEvents="none">
              <Text style={styles.topTitle} numberOfLines={1}>
                {getPlaceLabel(photo)}
              </Text>
              <Text style={styles.topSubtitle}>
                {dayNumber}일차 · {formatRecordTime(photo.createdAt)} · {currentIndex + 1}/
                {orderedIds.length}
              </Text>
            </View>
          ) : (
            <View style={styles.topMeta} />
          )}

          <Pressable
            accessibilityRole="button"
            onPress={handleSave}
            style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
          >
            <Text style={styles.doneButtonText}>완료</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {showChrome ? (
        <>
          <Pressable
            disabled={!hasPrev}
            onPress={() => hasPrev && goToPhoto(orderedIds[currentIndex - 1], 'prev')}
            style={[styles.sideNav, styles.sideNavLeft, { top: insets.top + 86 }, !hasPrev && styles.sideNavDisabled]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Pressable
            disabled={!hasNext}
            onPress={() => hasNext && goToPhoto(orderedIds[currentIndex + 1], 'next')}
            style={[styles.sideNav, styles.sideNavRight, { top: insets.top + 86 }, !hasNext && styles.sideNavDisabled]}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </Pressable>
        </>
      ) : null}

      {showDeleteTarget || showChrome ? (
        <SafeAreaView pointerEvents="box-none" style={styles.bottomSafe} edges={['bottom']}>
          {showDeleteTarget ? (
            <View style={styles.selectionBar} pointerEvents="none">
              <View
                ref={deleteChipRef}
                collapsable={false}
                onLayout={measureDeleteChip}
                style={[styles.selectionChip, trashHot && styles.selectionChipHot]}
              >
                <View style={styles.selectionChipPress}>
                  <Ionicons name="trash-outline" size={trashHot ? 24 : 22} color={colors.white} />
                </View>
              </View>
            </View>
          ) : null}

          {showChrome ? (
            <View style={styles.toolBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="텍스트"
                onPress={openTextTool}
                style={({ pressed }) => [styles.toolItem, pressed && styles.pressed]}
              >
                <Text style={styles.toolAa}>Aa</Text>
                <Text style={styles.toolLabel}>텍스트</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="스티커"
                onPress={openStickerTool}
                style={({ pressed }) => [styles.toolItem, pressed && styles.pressed]}
              >
                <Ionicons name="happy-outline" size={26} color={colors.white} />
                <Text style={styles.toolLabel}>스티커</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="더보기"
                onPress={() => setSheet('more')}
                style={({ pressed }) => [styles.toolItem, pressed && styles.pressed]}
              >
                <Ionicons name="ellipsis-horizontal" size={26} color={colors.white} />
                <Text style={styles.toolLabel}>더보기</Text>
              </Pressable>
            </View>
          ) : null}
        </SafeAreaView>
      ) : null}

      <Modal visible={sheet === 'sticker'} transparent animationType="slide" onRequestClose={() => setSheet('none')}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet('none')} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>스티커</Text>
          <ScrollView contentContainerStyle={styles.stickerGrid} showsVerticalScrollIndicator={false}>
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
          <SafeAreaView edges={['top']} style={styles.textModalTop}>
            <Pressable onPress={commitTextDraft} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>완료</Text>
            </Pressable>
          </SafeAreaView>
          <View style={styles.textComposer}>
            <View style={styles.textField}>
              <Text
                pointerEvents="none"
                style={[
                  styles.textInput,
                  styles.textPreview,
                  getFontInputStyle(draftFontId),
                  {
                    color: draftText.trim() ? draftColor : 'rgba(255,255,255,0.45)',
                  },
                ]}
              >
                {draftText.trim() ? draftText : '짧은 기록을 남겨 보세요'}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorBar}
              keyboardShouldPersistTaps="handled"
            >
              {DECOR_TEXT_COLORS.map((swatch) => {
                const active = swatch === draftColor;
                return (
                  <Pressable
                    key={swatch}
                    onPress={() => setDraftColor(swatch)}
                    style={styles.colorDotHit}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: swatch },
                        swatch === '#FFFFFF' && styles.colorDotLight,
                        active && styles.colorDotActive,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fontBar}
              keyboardShouldPersistTaps="handled"
            >
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

      <Modal visible={sheet === 'more'} transparent animationType="fade" onRequestClose={() => setSheet('none')}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet('none')} />
        <View style={[styles.moreSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.moreHint}>편집 중에는 사진·영상 원본을 바꾸거나 재촬영할 수 없어요.</Text>
          <Pressable
            onPress={handleDeleteRecord}
            style={({ pressed }) => [styles.moreDanger, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.moreDangerText}>이 기록 삭제</Text>
          </Pressable>
          <Pressable onPress={() => setSheet('none')} style={styles.moreCancel}>
            <Text style={styles.moreCancelText}>닫기</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function getFontInputStyle(fontId: DecorFontId) {
  return DECOR_FONTS.find((font) => font.id === fontId)?.style;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
  },
  topSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topMeta: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  topTitle: {
    ...typography.label,
    color: colors.white,
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topSubtitle: {
    ...typography.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  doneButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    ...typography.label,
    color: colors.black,
  },
  sideNav: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideNavLeft: {
    left: 10,
  },
  sideNavRight: {
    right: 10,
  },
  sideNavDisabled: {
    opacity: 0.25,
  },
  bottomSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectionBar: {
    alignItems: 'center',
    marginBottom: spacing.sm + 100,
    paddingHorizontal: spacing.md,
  },
  selectionChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    overflow: 'hidden',
  },
  selectionChipHot: {
    backgroundColor: 'rgba(214,69,69,0.88)',
    transform: [{ scale: 1.08 }],
  },
  selectionChipPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  toolItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  toolAa: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 28,
  },
  toolLabel: {
    ...typography.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '52%',
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.label,
    color: colors.white,
    marginBottom: spacing.md,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  stickerCell: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerCellText: {
    fontSize: 28,
  },
  textModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  textModalDim: {
    ...StyleSheet.absoluteFillObject,
  },
  textModalTop: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  textComposer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  textField: {
    minHeight: 80,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    minHeight: 80,
  },
  textPreview: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  textInputHit: {
    backgroundColor: 'transparent',
  },
  fontBarWrap: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  colorBar: {
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    alignItems: 'center',
  },
  colorDotHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotLight: {
    borderColor: 'rgba(255,255,255,0.35)',
  },
  colorDotActive: {
    borderColor: colors.white,
  },
  fontBar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  fontChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontChipActive: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  fontChipText: {
    fontSize: 14,
    color: colors.white,
  },
  fontChipTextActive: {
    color: colors.black,
  },
  moreSheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    padding: spacing.lg,
    gap: spacing.md,
  },
  moreHint: {
    ...typography.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },
  moreDanger: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(214,69,69,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  moreDangerText: {
    ...typography.button,
    color: colors.danger,
  },
  moreCancel: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCancelText: {
    ...typography.label,
    color: 'rgba(255,255,255,0.8)',
  },
  pressed: {
    opacity: 0.85,
  },
});
