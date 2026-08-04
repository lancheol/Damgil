import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DecorFontId, DecorSticker, PhotoDecoration } from '../../types/diary';
import {
  createStickerId,
  DECOR_FONTS,
  DECOR_STICKER_EMOJIS,
} from '../../utils/decorAssets';
import {
  formatRecordTime,
  getDayNumberForPhoto,
  getPlaceLabel,
  buildDiaryTimeline,
} from '../../utils/diaryTimeline';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryRecordDecorate'>;
type ToolSheet = 'none' | 'sticker' | 'text' | 'more';

const TRASH_Y = 0.88;

function emptyDecoration(note = ''): PhotoDecoration {
  return {
    stickers: [],
    note,
    fontId: 'sans',
    updatedAt: new Date().toISOString(),
  };
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

  const [note, setNote] = useState(initial.note);
  const [fontId, setFontId] = useState<DecorFontId>(initial.fontId);
  const [stickers, setStickers] = useState<DecorSticker[]>(initial.stickers);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [textSelected, setTextSelected] = useState(false);
  const [draggingSticker, setDraggingSticker] = useState(false);
  const [trashHot, setTrashHot] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sheet, setSheet] = useState<ToolSheet>('none');

  useEffect(() => {
    if (!photo) {
      return;
    }
    const next = photo.decoration ?? emptyDecoration(photo.note ?? '');
    setNote(next.note);
    setFontId(next.fontId);
    setStickers(next.stickers);
    setSelectedStickerId(null);
    setTextSelected(false);
    setDraggingSticker(false);
    setTrashHot(false);
    setDirty(false);
    setSheet('none');
  }, [photoId, photo?.decoration?.updatedAt, photo?.id]);

  const markDirty = useCallback(() => setDirty(true), []);

  const persist = useCallback(() => {
    if (!diary || !photo) {
      return false;
    }
    return savePhotoDecoration({
      diaryId,
      photoId: photo.id,
      decoration: {
        stickers,
        note,
        fontId,
      },
    });
  }, [diary, photo, diaryId, stickers, note, fontId, savePhotoDecoration]);

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
    setTextSelected(false);
  };

  const openTextTool = () => {
    clearSelection();
    setTextSelected(true);
    setSheet('text');
  };

  const openStickerTool = () => {
    setTextSelected(false);
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
    setTextSelected(false);
    setSheet('none');
    markDirty();
  };

  const deleteSelectedSticker = () => {
    if (!selectedStickerId) {
      return;
    }
    setStickers((prev) => prev.filter((item) => item.id !== selectedStickerId));
    setSelectedStickerId(null);
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
  const selectedSticker = stickers.find((item) => item.id === selectedStickerId) ?? null;
  const showChrome = !draggingSticker && sheet === 'none';

  return (
    <View style={styles.root}>
      <RecordDecorCanvas
        uri={photo.uri}
        mediaType={photo.mediaType}
        note={note}
        fontId={fontId}
        stickers={stickers}
        selectedStickerId={selectedStickerId}
        textSelected={textSelected}
        fullBleed
        onBackgroundPress={clearSelection}
        onSelectText={openTextTool}
        onSelectSticker={(id) => {
          setSelectedStickerId(id);
          setTextSelected(false);
          setSheet('none');
        }}
        onStickerDragChange={(dragging) => {
          setDraggingSticker(dragging);
          if (!dragging) {
            setTrashHot(false);
          }
        }}
        onMoveSticker={(id, x, y) => {
          setStickers((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
          setTrashHot(y >= TRASH_Y);
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
        onStickerDragEnd={(id) => {
          setStickers((prev) => {
            const target = prev.find((item) => item.id === id);
            if (!target || target.y < TRASH_Y) {
              return prev;
            }
            setSelectedStickerId(null);
            markDirty();
            return prev.filter((item) => item.id !== id);
          });
          setTrashHot(false);
          setDraggingSticker(false);
        }}
      />

      {/* Top chrome */}
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

      {/* Side navigation */}
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

      {/* Drag-to-delete trash */}
      {draggingSticker ? (
        <View
          pointerEvents="none"
          style={[styles.trashZone, { paddingBottom: Math.max(insets.bottom, 16) + 8 }, trashHot && styles.trashZoneHot]}
        >
          <Ionicons name="trash" size={trashHot ? 34 : 28} color={colors.white} />
          <Text style={styles.trashText}>{trashHot ? '놓아서 삭제' : '여기로 끌어 삭제'}</Text>
        </View>
      ) : null}

      {/* Bottom tools */}
      {showChrome ? (
        <SafeAreaView pointerEvents="box-none" style={styles.bottomSafe} edges={['bottom']}>
          {selectedSticker ? (
            <View style={styles.selectionBar}>
              <Pressable style={styles.selectionChip} onPress={deleteSelectedSticker}>
                <Ionicons name="trash-outline" size={18} color={colors.white} />
                <Text style={styles.selectionChipText}>삭제</Text>
              </Pressable>
              <Text style={styles.selectionHint}>핀치로 크기 · 두 손가락으로 회전</Text>
            </View>
          ) : null}

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
        </SafeAreaView>
      ) : null}

      {/* Sticker sheet */}
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

      {/* Text sheet */}
      <Modal visible={sheet === 'text'} transparent animationType="fade" onRequestClose={() => setSheet('none')}>
        <KeyboardAvoidingView
          style={styles.textModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.textModalDim}
            onPress={() => {
              setSheet('none');
              if (!note.trim()) {
                setTextSelected(false);
              }
            }}
          />
          <SafeAreaView edges={['top']} style={styles.textModalTop}>
            <Pressable
              onPress={() => {
                setSheet('none');
                if (!note.trim()) {
                  setTextSelected(false);
                }
              }}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>완료</Text>
            </Pressable>
          </SafeAreaView>
          <View style={styles.textComposer}>
            <TextInput
              value={note}
              onChangeText={(text) => {
                setNote(text);
                markDirty();
              }}
              placeholder="짧은 기록을 남겨 보세요"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={[styles.textInput, getFontInputStyle(fontId)]}
              multiline
              autoFocus
              maxLength={80}
            />
          </View>
          <SafeAreaView edges={['bottom']} style={styles.fontBarWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fontBar}
              keyboardShouldPersistTaps="handled"
            >
              {DECOR_FONTS.map((font) => {
                const active = font.id === fontId;
                return (
                  <Pressable
                    key={font.id}
                    onPress={() => {
                      setFontId(font.id);
                      markDirty();
                    }}
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

      {/* More sheet */}
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
  trashZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  trashZoneHot: {
    backgroundColor: 'rgba(214,69,69,0.72)',
  },
  trashText: {
    ...typography.label,
    color: colors.white,
    fontSize: 13,
  },
  bottomSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectionBar: {
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  selectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  selectionChipText: {
    ...typography.label,
    color: colors.white,
  },
  selectionHint: {
    ...typography.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
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
  textInput: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    minHeight: 80,
  },
  fontBarWrap: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  fontBar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
